import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Oculta el badge de Next.js en la esquina (para capturas de pantalla / demos).
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      // El menú del CRM muestra "Contratos" y "Prospectos", pero las rutas reales
      // son /alquileres y /clientes — si alguien escribe la URL "intuitiva" a mano
      // (o la tenía guardada), que la encuentre en vez de un 404 crudo.
      { source: "/contratos", destination: "/alquileres", permanent: false },
      { source: "/prospectos", destination: "/clientes", permanent: false },
    ];
  },
};

export default nextConfig;
