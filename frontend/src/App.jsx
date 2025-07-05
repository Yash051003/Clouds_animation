import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import ApiService from './services/api';

const colorStops = [
  [0, 0, 0],        // Black
  [255, 20, 147],  // Pink
  [78, 61, 139]   // Sky Blue
];

const interpolateColor = (c1, c2, t) =>
  c1.map((v, i) => Math.round(v + (c2[i] - v) * t));

const CloudScene = ({ scrollProgress }) => {
  const mountRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const cloudsRef = useRef([]);
  const frameRef = useRef();

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Better lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const loadCloudTextures = () => {
      return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        const cloudTextures = [];
        const loadPromises = [];
        
        // Load 3 cloud textures
        for (let i = 1; i <= 3; i++) {
          const promise = new Promise((resolveTexture) => {
            textureLoader.load(
              `/clouds/cloud${i}.png`,
              (texture) => {
                // Configure texture properties
                texture.transparent = true;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.needsUpdate = true;
                
                cloudTextures[i - 1] = texture;
                console.log(`✓ Loaded cloud${i}.png (${texture.image.width}x${texture.image.height})`);
                resolveTexture(texture);
              },
              undefined,
              (error) => {
                console.warn(`Could not load cloud${i}.png, creating fallback`);
                // Create a simple fallback texture
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                
                ctx.clearRect(0, 0, 512, 512);
                
                // Create simple cloud shape
                const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 200);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);
                
                const fallbackTexture = new THREE.CanvasTexture(canvas);
                fallbackTexture.transparent = true;
                fallbackTexture.wrapS = THREE.RepeatWrapping;
                fallbackTexture.wrapT = THREE.RepeatWrapping;
                fallbackTexture.minFilter = THREE.LinearFilter;
                fallbackTexture.magFilter = THREE.LinearFilter;
                fallbackTexture.needsUpdate = true;
                
                cloudTextures[i - 1] = fallbackTexture;
                resolveTexture(fallbackTexture);
              }
            );
          });
          loadPromises.push(promise);
        }
        
        Promise.all(loadPromises)
          .then(() => {
            console.log(`All cloud textures loaded: ${cloudTextures.length}`);
            resolve(cloudTextures);
          });
      });
    };

    const createClouds = async () => {
      try {
        const cloudTextures = await loadCloudTextures();
        const clouds = [];
      
        // Create bottom cloud cluster (foreground)
        const foregroundCount = 100;
        for (let i = 0; i < foregroundCount; i++) {
          const texture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)];
          
          const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8 + Math.random() * 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
          });
          
          const geometry = new THREE.PlaneGeometry(
            3 + Math.random() * 6,
            1.5 + Math.random() * 3
          );
          
          const cloud = new THREE.Mesh(geometry, material);
          
          // Position clouds at bottom of screen in a cluster
          cloud.position.set(
            (Math.random() - 0.5) * 80, // Wide horizontal spread
            -4 + Math.random() * 3, // Bottom cluster: -4 to -1
            -5 + Math.random() * 15 // Coming from behind towards front
          );
          
          cloud.rotation.z = (Math.random() - 0.5) * 0.3;
          
          const scale = 0.8 + Math.random() * 1.5;
          cloud.scale.set(scale, scale, scale);
          
          // Add movement properties - moving forward (towards camera)
          cloud.userData = {
            baseSpeed: 0.5 + Math.random() * 1.0, // Faster base speed
            floatSpeed: 0.3 + Math.random() * 0.4,
            floatAmount: 0.05 + Math.random() * 0.1,
            originalY: cloud.position.y,
            isBackground: false,
            initialZ: cloud.position.z
          };
          
          scene.add(cloud);
          clouds.push(cloud);
        }
        
        // Create mid-layer clouds
        const midLayerCount = 80;
        for (let i = 0; i < midLayerCount; i++) {
          const texture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)];
          
          const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            opacity: 0.5 + Math.random() * 0.3,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
          });
          
          const geometry = new THREE.PlaneGeometry(
            4 + Math.random() * 7,
            2 + Math.random() * 4
          );
          
          const cloud = new THREE.Mesh(geometry, material);
          
          // Position mid-layer clouds
          cloud.position.set(
            (Math.random() - 0.5) * 100,
            -3 + Math.random() * 2, // -3 to -1
            -20 + Math.random() * 15 // -20 to -5
          );
          
          cloud.rotation.z = (Math.random() - 0.5) * 0.2;
          
          const scale = 1.0 + Math.random() * 1.5;
          cloud.scale.set(scale, scale, scale);
          
          cloud.userData = {
            baseSpeed: 0.3 + Math.random() * 0.6,
            floatSpeed: 0.2 + Math.random() * 0.3,
            floatAmount: 0.03 + Math.random() * 0.07,
            originalY: cloud.position.y,
            isBackground: false,
            initialZ: cloud.position.z
          };
          
          scene.add(cloud);
          clouds.push(cloud);
        }
        
        // Create background clouds
        const backgroundCount = 30;
        for (let i = 0; i < backgroundCount; i++) {
          const texture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)];
          
          const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            opacity: 0.2 + Math.random() * 0.3,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
          });
          
          const geometry = new THREE.PlaneGeometry(
            5 + Math.random() * 10,
            2.5 + Math.random() * 5
          );
          
          const cloud = new THREE.Mesh(geometry, material);
          
          // Position background clouds further back
          cloud.position.set(
            (Math.random() - 0.5) * 120,
            -2 + Math.random() * 1.5, // -2 to -0.5
            -40 + Math.random() * 20 // -40 to -20
          );
          
          cloud.rotation.z = (Math.random() - 0.5) * 0.1;
          
          const scale = 1.2 + Math.random() * 2.0;
          cloud.scale.set(scale, scale, scale);
          
          cloud.userData = {
            baseSpeed: 0.1 + Math.random() * 0.3,
            floatSpeed: 0.1 + Math.random() * 0.2,
            floatAmount: 0.02 + Math.random() * 0.05,
            originalY: cloud.position.y,
            isBackground: true,
            initialZ: cloud.position.z
          };
          
          scene.add(cloud);
          clouds.push(cloud);
        }
        
        cloudsRef.current = clouds;
        console.log(`Created ${clouds.length} clouds successfully`);
      } catch (error) {
        console.error('Error creating clouds:', error);
        // Create fallback clouds without textures
        const clouds = [];
        for (let i = 0; i < 20; i++) {
          const material = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          
          const geometry = new THREE.PlaneGeometry(
            2 + Math.random() * 3,
            1 + Math.random() * 2
          );
          
          const cloud = new THREE.Mesh(geometry, material);
          cloud.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 10 - 2,
            (Math.random() - 0.5) * 20
          );
          
          cloud.userData = {
            baseSpeed: 0.3 + Math.random() * 0.7,
            floatSpeed: 0.5 + Math.random() * 0.5,
            floatAmount: 0.1 + Math.random() * 0.2,
            originalY: cloud.position.y,
            isBackground: false
          };
          
          scene.add(cloud);
          clouds.push(cloud);
        }
        cloudsRef.current = clouds;
      }
    };

    createClouds();

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      
      cloudsRef.current.forEach((cloud) => {
        const userData = cloud.userData;
        
        // Forward movement with scroll influence (Z-axis movement towards camera)
        const speedMultiplier = 1 + (scrollProgress * 4); // Increased scroll influence
        const moveSpeed = userData.baseSpeed * speedMultiplier;
        cloud.position.z += moveSpeed * 0.016; // Moving forward (towards camera)
        
        // Vertical floating
        const floatOffset = Math.sin(time * userData.floatSpeed) * userData.floatAmount;
        cloud.position.y = userData.originalY + floatOffset;
        
        // Reset position when cloud passes the camera
        if (cloud.position.z > 10) {
          cloud.position.z = userData.initialZ - Math.random() * 10;
          // Randomize position on reset
          cloud.position.x = (Math.random() - 0.5) * (userData.isBackground ? 120 : 80);
          const yRange = userData.isBackground ? 1.5 : 3;
          const yOffset = userData.isBackground ? -2 : -4;
          cloud.position.y = (Math.random() - 0.5) * yRange + yOffset + Math.random() * yRange;
          userData.originalY = cloud.position.y;
        }
      });
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (cameraRef.current) {
      // Slight camera movement based on scroll
      const targetY = scrollProgress * 2;
      const targetZ = 5 - scrollProgress * 2;
      cameraRef.current.position.y = targetY;
      cameraRef.current.position.z = targetZ;
    }
  }, [scrollProgress]);

  return <div ref={mountRef} className="fixed inset-0 -z-10" />;
};

// Contact Form Component
const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await ApiService.submitContactForm(formData);
      setSubmitStatus({ type: 'success', message: response.message });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to send message. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-white bg-opacity-10 backdrop-blur-md border border-white border-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
          />
        </div>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-white bg-opacity-10 backdrop-blur-md border border-white border-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
          />
        </div>
        <div>
          <textarea
            name="message"
            placeholder="Your Message"
            rows="4"
            value={formData.message}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-white bg-opacity-10 backdrop-blur-md border border-white border-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30 text-white py-3 rounded-lg font-medium hover:bg-opacity-30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
      
      {submitStatus && (
        <div className={`mt-4 p-4 rounded-lg ${
          submitStatus.type === 'success' 
            ? 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30' 
            : 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30'
        }`}>
          <p className="text-white text-sm">{submitStatus.message}</p>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        const data = await ApiService.fetchPortfolioData();
        setPortfolioData(data);
      } catch (error) {
        console.error('Failed to fetch portfolio data:', error);
        // Fallback data
        setPortfolioData({
          name: 'Portfolio',
          title: 'Full Stack Developer',
          description: 'Creating amazing web experiences',
          skills: ['React', 'Django', 'Three.js'],
          projects: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / docHeight, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateBackground = () => {
      const p = scrollProgress;
      let startColor, endColor, t;
      
      if (p < 0.5) {
        startColor = colorStops[0];
        endColor = colorStops[1];
        t = p / 0.5;
      } else {
        startColor = colorStops[1];
        endColor = colorStops[2];
        t = (p - 0.5) / 0.5;
      }
      
      const [r, g, b] = interpolateColor(startColor, endColor, t);
      document.body.style.background = `linear-gradient(180deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)}) 100%)`;
    };

    updateBackground();
  }, [scrollProgress]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <CloudScene scrollProgress={scrollProgress} />
      
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {portfolioData?.name || 'Your Name'}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300">
            {portfolioData?.title || 'Full Stack Developer'}
          </p>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-gray-400">
            {portfolioData?.description || 'Creating beautiful and functional web experiences'}
          </p>
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Skills</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(portfolioData?.skills || ['React', 'Node.js', 'Python', 'Django', 'Three.js', 'JavaScript', 'CSS', 'HTML']).map((skill, index) => (
              <div key={index} className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-4 text-center border border-white border-opacity-20">
                <span className="text-lg font-medium">{skill}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Projects</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(portfolioData?.projects || [
              { title: 'Project 1', description: 'Amazing web application', tech: ['React', 'Node.js'] },
              { title: 'Project 2', description: 'Interactive 3D experience', tech: ['Three.js', 'WebGL'] },
              { title: 'Project 3', description: 'Full-stack platform', tech: ['Django', 'PostgreSQL'] }
            ]).map((project, index) => (
              <div key={index} className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 border border-white border-opacity-20">
                <h3 className="text-xl font-bold mb-3">{project.title}</h3>
                <p className="text-gray-300 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech?.map((tech, techIndex) => (
                    <span key={techIndex} className="bg-white bg-opacity-20 px-2 py-1 rounded text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Get In Touch</h2>
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-gray-400 relative z-10">
        <p>&copy; 2024 {portfolioData?.name || 'Your Name'}. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;