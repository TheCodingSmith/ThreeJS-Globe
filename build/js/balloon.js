// forked from makc's "2D overlays in three.js" http://jsdo.it/makc/hw0L

function Balloon( html ) {
    THREE.Object3D.call( this );

    this.popup = document.createElement( 'div' );
    this.popup.classList.add( 'balloon' );
    this.popup.innerHTML = html;

    this.addEventListener( 'added', (function () {
        container.appendChild( this.popup );
    }).bind( this ));

    this.addEventListener( 'removed', (function () {
        container,removeChild( this.popup );
    }).bind( this ));
}

Balloon.prototype = Object.create( THREE.Object3D.prototype );
Balloon.prototype.constructor = Balloon;

Balloon.prototype.updateMatrixWorld = (function () {
    var screenVector = new THREE.Vector3 ();
    var raycaster = new THREE.Raycaster ();

    return function( force ) {
        THREE.Object3D.prototype.updateMatrixWorld.call( this, force );

        screenVector.set( 0, 0, 0 ); this.localToWorld( screenVector );

        raycaster.ray.direction.copy( screenVector );

        raycaster.ray.origin.set( 0, 0, 0 ); camera.localToWorld( raycaster.ray.origin );
        raycaster.ray.direction.sub( raycaster.ray.origin );

        var distance = raycaster.ray.direction.length();
        raycaster.ray.direction.normalize();

        var intersections = raycaster.intersectObject( scene, true );
        if( intersections.length && ( intersections[0].distance < distance )) {

            // overlay anchor is obscured
            this.popup.style.display = 'none';

        } else {

            // overlay anchor is visible
            screenVector.project( camera );

            this.popup.style.display = '';
            this.popup.style.left = Math.round((screenVector.x + 1) * container.offsetWidth / 2 - 50) + 'px';
            this.popup.style.top = Math.round((1 - screenVector.y) * container.offsetHeight / 2 - 50) + 'px';
        }
    };
}) ();

var scene, camera, renderer;
var geometry, material, mesh;

init();
animate();

function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, container.offsetWidth / container.offsetHeight, 1, 10000 );
    camera.position.y = 600;
    camera.position.z = 1000;
    camera.lookAt (scene.position );

    THREE.ImageUtils.crossOrigin = '';

    geometry = new THREE.SphereGeometry( 400, 30, 20 );
    material = new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture('http://i.imgur.com/DhOF0XH.jpg') } );

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xffffff );
    renderer.setSize( container.offsetWidth, container.offsetHeight );

    container.appendChild( renderer.domElement );

    // use google api to label clicked spot

    renderer.domElement.addEventListener( 'click', function (e) {
        var canvasRect = renderer.domElement.getBoundingClientRect ();
        var raycaster = new THREE.Raycaster ();

        raycaster.ray.origin.set (0, 0, 0);
        camera.localToWorld (raycaster.ray.origin);
        raycaster.ray.direction.set (
            ((e.clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
            ((canvasRect.top - e.clientY) / canvasRect.height) * 2 + 1,
        0.5).unproject (camera).sub (raycaster.ray.origin).normalize ();

        var intersects = raycaster.intersectObject (scene, true);
        if (intersects && intersects[0]) {

            var point = intersects[0].point;
            mesh.worldToLocal (point);

            var face = intersects[0].face;
            var faceIndex = intersects[0].faceIndex;
            var geometry = intersects[0].object.geometry;

            // find uv coordinates of clicked spot
            // http://stackoverflow.com/questions/24662720/retrieving-texture-map-coordinates-from-object-face-three-js#comment38235026_24662720

            var barry = new THREE.Vector3 ();
            THREE.Triangle.barycoordFromPoint (point,
                geometry.vertices[face.a],
                geometry.vertices[face.b],
                geometry.vertices[face.c],
                barry
            );

            var uv = new THREE.Vector2 ();
            uv.x += barry.x * geometry.faceVertexUvs[0][faceIndex][0].x;
            uv.y += barry.x * geometry.faceVertexUvs[0][faceIndex][0].y;
            uv.x += barry.y * geometry.faceVertexUvs[0][faceIndex][1].x;
            uv.y += barry.y * geometry.faceVertexUvs[0][faceIndex][1].y;
            uv.x += barry.z * geometry.faceVertexUvs[0][faceIndex][2].x;
            uv.y += barry.z * geometry.faceVertexUvs[0][faceIndex][2].y;

            // uv coordinates are straightforward to convert into lat/lon

            var lat = 180 * (uv.y - 0.5);
            var lon = 360 * (uv.x - 0.5);

            // this needs a key, but I don't care :)

            var url = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lon + "&sensor=false";
            $.getJSON(url, function (data) {
                if (data.results && data.results[0]) {
                    for (var i = 0; i < data.results[0].address_components.length; i++) {
                        if (data.results[0].address_components[i].types.indexOf ('country') > -1) {
                            var label = new Balloon(
                                '<div class="text">' +
                                data.results[0].address_components[i].long_name
                                + '</div>'
                                + '<div class="arrow"></div>' );
                            label.position.copy ( point ).multiplyScalar (1.01) ;
                            mesh.add( label );

                            break;
                        }
                    }
                }
            });
        }
    } );
}

function animate() {

    requestAnimationFrame( animate );

    mesh.rotation.y += 0.005;

    renderer.render( scene, camera );

}
