var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var center = new THREE.Vector3( 0, 1, 0 );
var radius = 40;
var sphere = new THREE.Sphere(center, radius);
scene.add( sphere );


camera.position.z = 5;

var animate = function () {
	requestAnimationFrame( animate );

	sphere.rotation.x += 0.1;
	sphere.rotation.y += 0.1;

	renderer.render(scene, camera);
};

animate();
