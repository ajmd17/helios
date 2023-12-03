import { Shader } from '../rendering/Shader';
import { ShaderType } from '../rendering/ShaderType';

export class ShaderFactory {
  private static _instance: ShaderFactory = null;

  public static get instance() {
    if (!ShaderFactory._instance) {
      ShaderFactory._instance = new ShaderFactory();
    }

    return ShaderFactory._instance;
  }

  public static readonly INCLUDES = {
    depth: `
      vec4 PackDepth32( in float depth )
      {
          depth *= (256.0*256.0*256.0 - 1.0) / (256.0*256.0*256.0);
          vec4 encode = fract( depth * vec4(1.0, 256.0, 256.0*256.0, 256.0*256.0*256.0) );
          return vec4( encode.xyz - encode.yzw / 256.0, encode.w ) + 1.0/512.0;
      }
      
      float UnpackDepth32( in vec4 pack )
      {
          float depth = dot( pack, 1.0 / vec4(1.0, 256.0, 256.0*256.0, 256.0*256.0*256.0) );
          return depth * (256.0*256.0*256.0) / (256.0*256.0*256.0 - 1.0);
      }

      uint PackDepthUint32( in float depth )
      {
          return floatBitsToUint( depth );
      }

      vec4 EncodeUint32( in uint value )
      {
          uint x = value % 256u;
          value /= 256u;
          uint y = value % 256u;
          value /= 256u;
          uint z = value % 256u;
          value /= 256u;
          uint w = value;
          return vec4( x, y, z, w ) / 255.0;
      }
    `.trim(),
    light: `
      struct Light {
        vec4 position;
        vec4 color;
        float intensity;
        int type;
      };

      uniform Light u_lights[16];
      uniform int u_numLights;

      #define PI 3.1415926535



      vec2 BRDFMap(float roughness, float NdotV)
      {
          // Same as EnvBRDFApprox( 0.04, Roughness, NoV )
          // const vec2 c0 = { -1.0, -0.0275 };
          // const vec2 c1 = { 1.0, 0.0425 };
          // vec2 r = roughness * c0 + c1;
          // float a004 = min(r.x * r.x, exp2(-9.28 * NdotV)) * r.x + r.y;
          // return vec2( -1.04, 1.04 ) * a004;

          vec4 c0 = vec4( -1.0, -0.0275, -0.572, 0.022 );
          vec4 c1 = vec4( 1.0, 0.0425, 1.04, -0.04 );
          vec4 r = roughness * c0 + c1;
          float a004 = min( r.x * r.x, exp2( -9.28 * NdotV ) ) * r.x + r.y;
          return vec2( -1.04, 1.04 ) * a004 + r.zw;
      }

      float Trowbridge(float NdotH, float roughness)
      {
          float alpha = roughness * roughness;
          float alpha2 = alpha * alpha;
          float NdotH2 = NdotH * NdotH;
          float denominator = PI * pow((alpha2 - 1.0) * NdotH2 + 1.0, 2.0);
          return alpha2 / denominator;
      }

      float CookTorranceG(float NdotL, float NdotV, float HdotV, float NdotH)
      {
          float first = 2.0 * NdotH * NdotV / HdotV;
          float second = 2.0 * NdotH * NdotL / HdotV;
          return min(1.0, min(first, second));
          //return min(1.0, 2.0 * (NdotH / LdotH) * min(NdotL, NdotV));
      }

      vec3 SchlickFresnelRoughness(vec3 f0, float roughness, float u)
      {
          return f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(1.0 - u, 5.0);
      }

      vec3 CalculateFresnelTerm(vec3 F0, float roughness, float NdotV)
      {
          return SchlickFresnelRoughness(F0, roughness, NdotV);
      }

      float CalculateGeometryTerm(float NdotL, float NdotV, float HdotV, float NdotH)
      {
          return CookTorranceG(NdotL, NdotV, HdotV, NdotH);
      }

      float CalculateDistributionTerm(float roughness, float NdotH)
      {
          return Trowbridge(NdotH, roughness);
      }

      vec3 CalculateDFG(vec3 F, float perceptual_roughness, float NdotV)
      {
          vec2 AB = BRDFMap(perceptual_roughness, NdotV);

          return F * AB.x + AB.y;
      }

      vec3 CalculateE(vec3 F0, vec3 dfg)
      {
          return mix(dfg.xxx, dfg.yyy, F0);
      }
    `.trim(),
    material: `
      struct Material {
        vec4 diffuseColor;
        float metalness;
        float roughness;
      };

      uniform Material u_material;
    `.trim()
  };

  public static readonly DEFINITIONS = {
    basic: {
      [ShaderType.VERTEX]: `
        #version 300 es

        in vec3 a_position;
        in vec2 a_texcoord;
        in vec3 a_normal;

        out vec2 v_texcoord;
        out vec3 v_normal;
        out vec4 v_worldNormal;
        out vec4 v_worldPosition;
        out vec4 v_projectedPosition;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_viewProjectionMatrix;

        void main() {
          mat4 normalMatrix = transpose(inverse(u_modelMatrix));

          v_texcoord = a_texcoord;
          v_normal = a_normal;
          v_worldNormal = normalMatrix * vec4(v_normal, 0.0);
          v_worldPosition = u_modelMatrix * vec4(a_position, 1.0);
          v_projectedPosition = u_viewProjectionMatrix * v_worldPosition;

          gl_Position = v_projectedPosition;
        }
      `.trim(),
      [ShaderType.FRAGMENT]: `
        #version 300 es

        precision mediump float;

        #define FLAG_DIFFUSE_MAP 1

        in vec2 v_texcoord;
        in vec3 v_normal;
        in vec4 v_worldNormal;
        in vec4 v_worldPosition;
        in vec4 v_projectedPosition;

        uniform sampler2D u_diffuseMap;
        uniform vec4 u_params;
        uniform vec3 u_cameraPosition;
        uniform samplerCube u_environmentMap;
        uniform int u_flags;

        layout (location = 0) out vec4 outColor;
        layout (location = 1) out vec4 outPackedDepth;
        layout (location = 2) out vec4 outNormals;

        #include <depth>
        #include <light>
        #include <material>

        void main() {
          vec4 albedo = u_material.diffuseColor;
          
          if ((u_flags & FLAG_DIFFUSE_MAP) == FLAG_DIFFUSE_MAP) {
            albedo *= vec4(texture(u_diffuseMap, v_texcoord).rgb, 1.0);
          }

          float metalness = u_material.metalness;
          float roughness = u_material.roughness;

          vec3 diffuseColor = albedo.rgb * (1.0 - metalness);

          vec3 color = vec3(0.0);

          vec3 N = v_normal;
          vec3 V = normalize(u_cameraPosition - v_worldPosition.xyz);

          float NdotV = max(dot(N, V), 0.0);

          float materialReflectance = 0.5;
          float reflectance = 0.16 * materialReflectance * materialReflectance;
          vec3 F0 = vec3(albedo.rgb * metalness + (reflectance * (1.0 - metalness)));
          vec3 F90 = vec3(clamp(dot(F0, vec3(50.0 * 0.33)), 0.0, 1.0));

          vec3 F = CalculateFresnelTerm(F0, roughness, NdotV);

          vec3 dfg = CalculateDFG(F, roughness, NdotV);
          vec3 E = CalculateE(F0, dfg);

          // Sample environment for indirect lighting
          vec3 R = reflect(-V, N);
          vec3 irradiance = texture(u_environmentMap, N, 9.0).rgb;
          vec3 ibl = texture(u_environmentMap, R, roughness * 9.0).rgb;
          vec3 Fd = diffuseColor * irradiance * (vec3(1.0) - E);
          vec3 Fr = ibl * E;
          vec3 indirectHit = Fd + Fr;

          color += indirectHit;

          for (int i = 0; i < u_numLights; i++) {
            Light light = u_lights[i];

            vec3 L = light.position.xyz;
            L -= v_worldPosition.xyz * float(min(light.type, 1));
            L = normalize(L);

            vec3 H = normalize(L + V);

            float NdotL = max(dot(N, L), 0.0);
            float NdotH = max(dot(N, H), 0.0);
            float LdotH = max(dot(L, H), 0.0);
            float HdotV = max(dot(H, V), 0.0);

            float D = CalculateDistributionTerm(roughness, NdotH);
            float G = CalculateGeometryTerm(NdotL, NdotV, HdotV, NdotH);
            vec3 F = CalculateFresnelTerm(F0, roughness, LdotH);

            vec3 diffuseLobe = diffuseColor / PI;
            vec3 specularLobe = vec3(D) * vec3(G) * F;
            
            vec3 directHit = (diffuseLobe + specularLobe) * light.color.rgb * light.intensity * NdotL;

            color += directHit;
          }

          outColor = vec4(color, 1.0);

          outPackedDepth = EncodeUint32(PackDepthUint32(v_projectedPosition.z / v_projectedPosition.w));
          outNormals = vec4(normalize(v_worldNormal.xyz) * 0.5 + vec3(0.5), 1.0);
        }
      `.trim()
    },
    skybox: {
      [ShaderType.VERTEX]: `
        #version 300 es

        in vec3 a_position;
        in vec2 a_texcoord;
        in vec3 a_normal;

        out vec2 v_texcoord;
        out vec3 v_normal;
        out vec4 v_worldPosition;
        out vec4 v_projectedPosition;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_viewProjectionMatrix;

        void main() {
          v_texcoord = a_texcoord;
          v_normal = a_normal;
          v_worldPosition = u_modelMatrix * vec4(a_position, 1.0);
          v_projectedPosition = u_viewProjectionMatrix * v_worldPosition;

          gl_Position = v_projectedPosition;
        }
      `.trim(),
      [ShaderType.FRAGMENT]: `
        #version 300 es

        precision highp float;

        in vec2 v_texcoord;
        in vec3 v_normal;
        in vec4 v_worldPosition;
        in vec4 v_projectedPosition;

        uniform samplerCube u_environmentMap;

        layout (location = 0) out vec4 outColor;
        layout (location = 1) out vec4 outPackedDepth;
        layout (location = 2) out vec4 outNormals;

        #include <depth>

        void main() {
          // Sample cubemap
          vec4 color = texture(u_environmentMap, v_normal, 0.0);
          outColor = color;
          outPackedDepth = EncodeUint32(PackDepthUint32(v_projectedPosition.z / v_projectedPosition.w));
          outNormals = vec4(v_normal * 0.5 + vec3(0.5), 1.0);
        }
      `.trim()
    },
    overlay: {
      [ShaderType.VERTEX]: `
        #version 300 es

        in vec3 a_position;
        in vec2 a_texcoord;
        in vec3 a_normal;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_viewProjectionMatrix;

        out vec2 v_texcoord;
        out vec3 v_normal;

        void main() {
          v_texcoord = a_texcoord;
          v_normal = a_normal;

          gl_Position = u_viewProjectionMatrix * u_modelMatrix * vec4(a_position, 1.0);
        }
      `.trim(),
      [ShaderType.FRAGMENT]: `
        #version 300 es

        precision mediump float;

        in vec2 v_texcoord;
        in vec3 v_normal;

        layout (location = 0) out vec4 outColor;
        layout (location = 1) out vec4 outPackedDepth;
        layout (location = 2) out vec4 outNormals;

        void main() {
          vec4 color = vec4(1.0, 0.0, 0.0, 0.5);

          if (color.a < 0.1) {
            discard;
          }

          outColor = color;
          outPackedDepth = vec4(1.0, 1.0, 1.0, 0.0);
          outNormals = vec4(0.0);
        }
      `.trim()
    },

    gaussianSplatting: {
      [ShaderType.VERTEX]: `
        #version 300 es

        in vec3 a_position;
        in vec2 a_texcoord;
        in vec3 a_normal;

        in vec3 a_center;
        in vec4 a_rotation;
        in vec3 a_scale;
        in vec4 a_color;

        out vec3 v_position;
        out vec4 v_color;
        out vec4 v_conic_radius;
        out vec2 v_center_screen_position;
        out vec2 v_quad_position;
        out vec2 v_uv;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_viewProjectionMatrix;
        uniform mat4 u_projectionMatrix;
        uniform vec2 u_resolution;

        void CalcCovariance3D(mat3 rot, out vec3 sigma0, out vec3 sigma1)
        {
          mat3 sig = transpose(rot) * (rot);
          sigma0 = vec3(sig[0][0], sig[0][1], sig[0][2]);
          sigma1 = vec3(sig[1][1], sig[1][2], sig[2][2]);
        }

        vec3 CalcCovariance2D(vec3 worldPos, vec3 cov3d0, vec3 cov3d1)
        {
          mat4 view = u_viewMatrix;
          vec4 viewPos = view * vec4(worldPos, 1.0);

          float aspect = u_projectionMatrix[0][0] / u_projectionMatrix[1][1];
          float tanFovX = 1.0 / u_projectionMatrix[0][0];
          float tanFovY = aspect / u_projectionMatrix[1][1];
          float limX = 1.3 * tanFovX;
          float limY = 1.3 * tanFovY;
          viewPos.x = clamp(viewPos.x / viewPos.z, -limX, limX) * viewPos.z;
          viewPos.y = clamp(viewPos.y / viewPos.z, -limY, limY) * viewPos.z;

          float focal = u_resolution.x * u_projectionMatrix[0][0] / 2.0;

          // mat4 J = mat4(
          //   focal / viewPos.z, 0.0, -(focal * viewPos.x) / (viewPos.z * viewPos.z), 0.0,
          //   0.0, focal / viewPos.z, -(focal * viewPos.y) / (viewPos.z * viewPos.z), 0.0,
          //   0.0, 0.0, 0.0, 0.0,
          //   0.0, 0.0, 0.0, 0.0
          // );

          mat4 J = mat4(
            focal / viewPos.z, 0.0, -(focal * viewPos.x) / (viewPos.z * viewPos.z), 0.0,
            0.0, -focal / viewPos.z, (focal * viewPos.y) / (viewPos.z * viewPos.z), 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0
          );

          //view[0][3] = 0.0;
          //view[1][3] = 0.0;
          //view[2][3] = 0.0;

          mat4 W = transpose(view);
          mat4 T = W * J;
          mat4 V = mat4(
            cov3d0.x, cov3d0.y, cov3d0.z, 0.0,
            cov3d0.y, cov3d1.x, cov3d1.y, 0.0,
            cov3d0.z, cov3d1.y, cov3d1.z, 0.0,
            0.0, 0.0, 0.0, 0.0
          );
          mat4 cov = transpose(T) * transpose(V) * T;

          // Low pass filter to make each splat at least 1px size.
          cov[0][0] += 0.3;
          cov[1][1] += 0.3;
          return vec3(cov[0][0], cov[0][1], cov[1][1]);
        }

        mat3 CalcMatrixFromRotationScale(vec4 rot, vec3 scale, float scale_modifier)
        {
          mat3 ms = mat3(
            exp(scale.x) * scale_modifier, 0.0, 0.0,
            0.0, exp(scale.y) * scale_modifier, 0.0,
            0.0, 0.0, exp(scale.z) * scale_modifier
          );
          float w = rot.w;
          float r = rot.w;
          float x = rot.x;
          float y = rot.y;
          float z = rot.z;

          mat3 mr = mat3(
            /*1.0 - 2.0 * (y * y + z * z),    2.0 * (x * y + w * z),          2.0 * (x * z - w * y),
            2.0 * (x * y - w * z),          1.0 - 2.0 * (x * x + z * z),    2.0 * (y * z + w * x),
            2.0 * (x * z + w * y),          2.0 * (y * z - w * x),          1.0 - 2.0 * (x * x + y * y)*/

            1. - 2. * (y * y + z * z), 2. * (x * y - r * z), 2. * (x * z + r * y),
            2. * (x * y + r * z), 1. - 2. * (x * x + z * z), 2. * (y * z - r * x),
            2. * (x * z - r * y), 2. * (y * z + r * x), 1. - 2. * (x * x + y * y)
          );

          return (ms * mr);
        }

        float rcp(float x)
        {
            return 1.0 / x;
        }

        void main() {
          // v_color = a_color;

          // gl_Position = u_viewProjectionMatrix * u_modelMatrix * vec4(a_position + a_center, 1.0);

          vec2 quad_position = a_position.xy;

          vec3 world_position = (u_modelMatrix * vec4(a_center.xyz, 1.0)).xyz;

          vec4 rotation = a_rotation;
          vec3 scale = a_scale.xyz;

          mat3 rotation_scale_matrix = CalcMatrixFromRotationScale(rotation, scale, 1.0) * mat3(u_modelMatrix);

          vec3 covariance_3d_0;
          vec3 covariance_3d_1;

          CalcCovariance3D(rotation_scale_matrix, covariance_3d_0, covariance_3d_1);

          vec3 covariance_2d = CalcCovariance2D(
            world_position,
            covariance_3d_0,
            covariance_3d_1
          );

          float det = covariance_2d.x * covariance_2d.z - covariance_2d.y * covariance_2d.y;

          float mid = 0.5 * (covariance_2d.x + covariance_2d.z);
          float lambda1 = mid + sqrt(max(0.1, mid * mid - det));
          float lambda2 = mid - sqrt(max(0.1, mid * mid - det));
          float radius = ceil(3.0 * sqrt(max(lambda1, lambda2)));

          vec3 conic = vec3(covariance_2d.z, -covariance_2d.y, covariance_2d.x) * rcp(det);
          vec4 conic_radius = vec4(conic, radius);

          vec4 center_ndc_position = u_projectionMatrix * u_viewMatrix * vec4(world_position, 1.0);
          center_ndc_position /= center_ndc_position.w;

          vec2 center_screen_position = (center_ndc_position.xy * 0.5 + 0.5) * u_resolution;

          vec2 delta_screen_position = quad_position * radius * 2.0 / u_resolution;
          
          gl_Position = center_ndc_position + vec4(delta_screen_position, 0.0, 0.0);

          v_color = a_color;
          v_position = gl_Position.xyz;
          v_quad_position = quad_position;
          v_conic_radius = conic_radius;
          v_uv = vec2(quad_position * radius);
        }
      `.trim(),
      [ShaderType.FRAGMENT]: `
        #version 300 es

        precision highp float;

        layout (location = 0) out vec4 outColor;

        in vec3 v_position;
        in vec4 v_color;
        in vec4 v_conic_radius;
        in vec2 v_center_screen_position;
        in vec2 v_quad_position;
        in vec2 v_uv;

        #include <depth>

        void main() {
          vec4 color = v_color;

          vec2 d = -v_uv;
          vec3 conic = v_conic_radius.xyz;
          float power = -0.5 * (conic.x * d.x * d.x + conic.z * d.y * d.y) + conic.y * d.x * d.y;

          if (power > 0.0) {
              discard;
          }

          float alpha = min(0.99, color.a * exp(power));

          outColor = vec4(color.rgb * alpha, alpha);
        }
      `.trim()
    },
    blit: {
      [ShaderType.VERTEX]: `
        #version 300 es

        in vec3 a_position;
        in vec2 a_texcoord;
        in vec3 a_normal;

        out vec2 v_texcoord;
        out vec3 v_normal;

        void main() {
          v_texcoord = a_texcoord;
          v_normal = a_normal;

          gl_Position = vec4(a_position, 1.0);
        }
      `.trim(),
      [ShaderType.FRAGMENT]: `
        #version 300 es

        precision mediump float;

        in vec2 v_texcoord;
        in vec3 v_normal;

        uniform sampler2D u_texture;

        layout (location = 0) out vec4 outColor;
        layout (location = 1) out vec4 outPackedDepth;
        layout (location = 2) out vec4 outNormals;

        void main() {
          vec4 blitTexture = texture(u_texture, v_texcoord);

          // Gamma correction
          blitTexture.rgb = pow(blitTexture.rgb, vec3(1.0 / 2.2));

          outColor = blitTexture;
        }
      `.trim()
    },
    fxaa: {
      [ShaderType.VERTEX]: `
        #version 300 es

        in vec3 a_position;
        in vec2 a_texcoord;
        in vec3 a_normal;

        out vec2 v_texcoord;
        out vec3 v_normal;

        void main() {
          v_texcoord = a_texcoord;
          v_normal = a_normal;

          gl_Position = vec4(a_position, 1.0);
        }
      `.trim(),
      [ShaderType.FRAGMENT]: `
        #version 300 es

        precision mediump float;

        in vec2 v_texcoord;
        in vec3 v_normal;

        uniform sampler2D u_texture;
        uniform vec2 u_resolution;

        layout (location = 0) out vec4 outColor;
        layout (location = 1) out vec4 outPackedDepth;
        layout (location = 2) out vec4 outNormals;

        void main() {
          float FXAA_SPAN_MAX = 8.0;
          float FXAA_REDUCE_MUL = 1.0/8.0;
          float FXAA_REDUCE_MIN = 1.0/128.0;
      
          vec2 inverseResolution = vec2(1.0) / u_resolution;

          vec3 rgbNW = texture(u_texture, (v_texcoord + vec2(-1.0, -1.0)) * inverseResolution).xyz;
          vec3 rgbNE = texture(u_texture, (v_texcoord + vec2(1.0, -1.0)) * inverseResolution).xyz;
          vec3 rgbSW = texture(u_texture, (v_texcoord + vec2(-1.0, 1.0)) * inverseResolution).xyz;
          vec3 rgbSE = texture(u_texture, (v_texcoord + vec2(1.0, 1.0)) * inverseResolution).xyz;
          vec3 rgbM = texture(u_texture, v_texcoord).xyz;

          vec3 luma = vec3(0.299, 0.587, 0.114);
          float lumaNW = dot(rgbNW, luma);
          float lumaNE = dot(rgbNE, luma);
          float lumaSW = dot(rgbSW, luma);
          float lumaSE = dot(rgbSE, luma);
          float lumaM = dot(rgbM, luma);

          float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
          float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

          vec2 dir;
          dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
          dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

          float dirReduce = max(
            (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
            FXAA_REDUCE_MIN
          );
          
          float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

          dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
            max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
            dir * rcpDirMin)) * inverseResolution;

          vec3 rgbA = 0.5 * (
            texture(u_texture, v_texcoord + dir * (1.0 / 3.0 - 0.5)).xyz +
            texture(u_texture, v_texcoord + dir * (2.0 / 3.0 - 0.5)).xyz
          );

          vec3 rgbB = rgbA * 0.5 + 0.25 * (
            texture(u_texture, v_texcoord + dir * -0.5).xyz +
            texture(u_texture, v_texcoord + dir * 0.5).xyz
          );

          float lumaB = dot(rgbB, luma);

          if (lumaB < lumaMin || lumaB > lumaMax) {
            outColor = vec4(rgbA, 1.0);
          } else {
            outColor = vec4(rgbB, 1.0);
          }

          // Gamma correction
          outColor.rgb = pow(outColor.rgb, vec3(1.0 / 2.2));

          outPackedDepth = vec4(1.0, 1.0, 1.0, 0.0);
          outNormals = vec4(0.0);
        }
      `.trim()
    }
  };

  private _shaders: Map<string, Shader> = new Map<string, Shader>();

  getShader(name: keyof typeof ShaderFactory.DEFINITIONS): Shader {
    let shaderInstance = this._shaders.get(name);

    if (shaderInstance) {
      return shaderInstance;
    }

    const definition = ShaderFactory.DEFINITIONS[name];

    if (!definition) {
      throw new Error(`Shader definition not found: ${name}`);
    }

    shaderInstance = new Shader(name);

    for (const [key, value] of Object.entries(definition)) {
      let preprocessedSource = '';

      const lines = value.split('\n');

      for (const line of lines) {
        // Replace `#include <foo>` with the contents of the fake file
        if (line.trim().startsWith('#include')) {
          const includePath = line.trim().split(' ')[1].replace(/[<>\n]/g, '');

          preprocessedSource += (ShaderFactory.INCLUDES[includePath] ?? '#error "Unknown include"') + '\n';
        } else {
          preprocessedSource += line + '\n';
        }
      }

      shaderInstance.addSource(parseInt(key), preprocessedSource);
    }

    this._shaders.set(name, shaderInstance);

    return shaderInstance;
  }
}

export type BuiltinShaderName = keyof typeof ShaderFactory.DEFINITIONS;