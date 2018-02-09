function Country( html ) {
    THREE.Object3D.call( this );

    this.popup = document.createElement( 'div' );
    this.popup.classList.add( 'country' );
    this.popup.innerHTML = html;

    this.addEventListener( 'added', (function () {
        countryInfo.appendChild( this.popup );
    }).bind( this ));
}

Country.prototype = Object.create( THREE.Object3D.prototype );
Country.prototype.constructor = Country;

Country.prototype.updateMatrixWorld = (function () {
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
    };
}) ();


// Start Globe Render

var renderer = new THREE.WebGLRenderer({canvas: document.getElementById('globeSpace'), antialias: true});
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );


// Creates new Scene to be pushed to.
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 1500, window.innerWidth/window.innerHeight, 1, 5000 );
camera.position.z = 1500;

//Lights

var light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,3,5);
scene.add(light);

// Image
var img = new THREE.MeshBasicMaterial({
	map:THREE.ImageUtils.loadTexture('images/2_no_clouds_4k.jpg'),
	cloud:THREE.ImageUtils.loadTexture('images/fair_clouds_8k.jpg')
});

// Creates Sphere
var geometry = new THREE.SphereGeometry( 500, 50, 50 );
// Adds image to sphere
var mesh = new THREE.Mesh( geometry, img );
mesh.position.z = -1;

scene.add( mesh );


// Movable Camera
var controls = new THREE.TrackballControls(camera);
controls.update();


function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
window.addEventListener( 'resize', onWindowResize, false );


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

				// this needs a key. Add at some point

				var url = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lon + "&sensor=false";
				$.getJSON(url, function (data) {
						if (data.results && data.results[0]) {
								for (var i = 0; i < data.results[0].address_components.length; i++) {
										if (data.results[0].address_components[i].types.indexOf ('country') > -1) {
												var countryName = data.results[0].address_components[i].long_name;
												var label = new Country(
														'<div class="name">'
														+ '<span>' +
														countryName
														+ '</span>'
														+ '</div>'
														+ '<div class="indexInformation"></div>'
													 	+ '<a class="close">close[X]</a>');

														var dimensions = 'https://api.myjson.com/bins/11rhq9'
														$.getJSON(dimensions, function(sixD) {
																var label2 = new Country(
																	"<p> PDI: " + sixD.results[countryName].pdi + "</P>" +
																	"<p> IDV: " + sixD.results[countryName].idv + "</P>" +
																	"<p> MAS: " + sixD.results[countryName].mas + "</P>" +
																	"<p> UAI: " + sixD.results[countryName].uai + "</P>" +
																	"<p> LTOWVS: " + sixD.results[countryName].ltowvs + "</P>" +
																	"<p> IVR: " + sixD.results[countryName].ivr + "</P>"
																);

																label2.position.copy ( point ) ;
																mesh.add( label2 );

														});


												label.position.copy ( point ).multiplyScalar (1.01) ;
												mesh.add( label );

												break;
										}
								}
						}
				});
		}
} );


// Close button on info
$(document).on('click', '.close', function(){
	$(this).parent().remove();
});

var animate = function () {
	requestAnimationFrame( animate );

	mesh.rotation.y += 0.0002;

	controls.update();

	renderer.render(scene, camera);
};

animate();
