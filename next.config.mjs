/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      use: {
        loader: "file-loader",
        options: {
          publicPath: "/_next/static/models/",
          outputPath: "static/models/",
          name: "[name].[ext]",
        },
      },
    });
    return config;
  },
};

export default nextConfig;
