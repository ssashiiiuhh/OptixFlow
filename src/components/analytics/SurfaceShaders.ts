export const surfaceVertexShader = `
uniform float uTime;
attribute float aViolation;
varying vec3 vColor;
varying float vViolation;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vColor = color;
  vViolation = aViolation;
  
  // Basic normal and view position for lighting if needed
  vec3 objectNormal = vec3(normal);
  vNormal = normalize(normalMatrix * objectNormal);
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  
  // Optional: add a slight physical displacement or pulse based on violation and time
  vec3 pos = position;
  if (aViolation > 0.8) {
    float pulse = sin(uTime * 5.0) * 0.5 + 0.5; // 0.0 to 1.0
    pos.z += pulse * 0.2 * (aViolation - 0.8);
  }
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const surfaceFragmentShader = `
uniform float uTime;
varying vec3 vColor;
varying float vViolation;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 baseColor = vColor;
  vec3 warningColor = vec3(1.0, 0.0, 1.0); // Bright Magenta/Red
  
  // Non-linear ramp with dead-zone
  float severity = 0.0;
  if (vViolation > 0.01) {
    // scale 0.01 -> 1.0 to 0.0 -> 1.0
    float normalizedViol = clamp((vViolation - 0.01) / 0.99, 0.0, 1.0);
    // non-linear exponential ramp
    severity = pow(normalizedViol, 1.5); 
  }
  
  // Blend based on violation magnitude
  vec3 finalColor = mix(baseColor, warningColor, severity);
  
  // Add pulse effect if violation is severe
  if (vViolation > 0.8) {
    float pulse = sin(uTime * 10.0) * 0.5 + 0.5;
    finalColor = mix(finalColor, vec3(1.0, 0.0, 0.0), pulse * 0.5 * severity); // Pulse to bright red
  }
  
  // Basic lighting (phong-like pseudo lighting)
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diff = max(dot(normal, lightDir), 0.0);
  
  vec3 ambient = vec3(0.3);
  finalColor = finalColor * (ambient + diff * 0.7);
  
  gl_FragColor = vec4(finalColor, 0.88); // 0.88 opacity as per previous material
}
`;
