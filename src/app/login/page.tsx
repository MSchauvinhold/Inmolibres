"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Eye, EyeOff, Loader2, Home } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "motion/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Email o contraseña incorrectos");
      } else {
        const session = await getSession();
        if (session?.user?.rol === "SUPERADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      toast.error("Error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" data-color-scheme="light" style={{ colorScheme: "light" }}>
      {/* Left panel — animated gradient */}
      <div
        className="hidden lg:flex lg:w-3/5 relative overflow-hidden items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #FAF0E6 0%, #F5DEB3 25%, #E8C49A 50%, #DEB887 75%, #FAF0E6 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 8s ease infinite",
        }}
      >
        {/* Dot texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(139,69,19,0.07) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Rooftop skyline */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg
            viewBox="0 0 1440 88"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            style={{ width: "100%", height: 88, display: "block" }}
          >
            <path
              d="M0,88 L0,62 L30,62 L30,42 L50,24 L70,42 L70,62 L110,62 L110,48 L130,32 L150,48 L150,62 L180,62 L180,52 L200,36 L212,26 L224,36 L244,52 L244,62 L280,62 L280,44 L302,28 L322,44 L322,62 L360,62 L360,54 L380,40 L392,32 L404,40 L424,54 L424,62 L460,62 L460,48 L482,30 L502,48 L502,62 L540,62 L540,56 L560,44 L572,36 L584,44 L604,56 L604,62 L640,62 L640,44 L662,26 L682,44 L682,62 L720,62 L720,52 L740,38 L752,30 L764,38 L784,52 L784,62 L820,62 L820,48 L842,32 L862,48 L862,62 L900,62 L900,54 L920,42 L930,34 L940,42 L960,54 L960,62 L1000,62 L1000,44 L1022,26 L1042,44 L1042,62 L1080,62 L1080,52 L1100,38 L1112,30 L1124,38 L1144,52 L1144,62 L1180,62 L1180,48 L1200,32 L1220,48 L1220,62 L1260,62 L1260,56 L1280,44 L1292,36 L1304,44 L1324,56 L1324,62 L1360,62 L1360,44 L1382,26 L1402,44 L1402,62 L1440,62 L1440,88 Z"
              fill="rgba(139,69,19,0.07)"
            />
            <path
              d="M0,88 L0,68 L28,68 L28,50 L48,32 L68,50 L68,68 L108,68 L108,55 L128,38 L148,55 L148,68 L178,68 L178,58 L196,42 L208,32 L220,42 L240,58 L240,68 L278,68 L278,50 L298,34 L318,50 L318,68 L358,68 L358,60 L376,46 L388,38 L400,46 L420,60 L420,68 L458,68 L458,54 L478,36 L498,54 L498,68 L538,68 L538,62 L556,50 L568,42 L580,50 L600,62 L600,68 L638,68 L638,50 L658,32 L678,50 L678,68 L718,68 L718,58 L736,44 L748,36 L760,44 L780,58 L780,68 L818,68 L818,54 L838,38 L858,54 L858,68 L898,68 L898,60 L916,46 L928,38 L938,46 L958,60 L958,68 L998,68 L998,50 L1018,32 L1038,50 L1038,68 L1078,68 L1078,58 L1096,44 L1108,36 L1120,44 L1140,58 L1140,68 L1178,68 L1178,54 L1196,38 L1216,54 L1216,68 L1258,68 L1258,62 L1276,50 L1288,42 L1300,50 L1320,62 L1320,68 L1358,68 L1358,50 L1378,32 L1398,50 L1398,68 L1440,68 L1440,88 Z"
              fill="rgba(250,248,245,0.9)"
            />
          </svg>
        </div>

        {/* Brand content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 text-center px-12"
        >
          <h1
            style={{
              fontFamily: "var(--font-fraunces)",
              color: "var(--antracite)",
              fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            InmoLibres
          </h1>
          <p
            className="mt-4 text-lg max-w-sm mx-auto leading-relaxed"
            style={{
              color: "var(--antracite-mid)",
              fontFamily: "var(--font-jakarta)",
            }}
          >
            La plataforma inmobiliaria de{" "}
            <span style={{ color: "var(--terra-mid)", fontWeight: 600 }}>
              Paso de los Libres
            </span>
          </p>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div
        className="flex-1 lg:w-2/5 flex items-center justify-center px-6 py-12"
        style={{ background: "#FFFFFF", colorScheme: "light" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="mb-8 text-center lg:text-left">
            <h2
              style={{
                fontFamily: "var(--font-fraunces)",
                color: "var(--antracite)",
                fontSize: "2rem",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              InmoLibres
            </h2>
            <p
              className="mt-1.5 text-sm"
              style={{
                color: "var(--antracite-light)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Accedé a tu panel de gestión
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{
                  color: "var(--antracite-mid)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="input-base w-full"
                autoComplete="email"
                style={{
                  fontFamily: "var(--font-jakarta)",
                  backgroundColor: "white",
                  color: "#1A1612",
                  border: "1px solid #DDD5C8",
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{
                  color: "var(--antracite-mid)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-base w-full pr-10"
                  autoComplete="current-password"
                  style={{
                    fontFamily: "var(--font-jakarta)",
                    backgroundColor: "white",
                    color: "#1A1612",
                    border: "1px solid #DDD5C8",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                  style={{ color: "var(--antracite-light)" }}
                  tabIndex={-1}
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-terra w-full flex items-center justify-center gap-2 py-3 rounded-xl"
              style={{ fontFamily: "var(--font-jakarta)", fontSize: "0.9375rem" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
              style={{
                color: "var(--antracite-light)",
                fontFamily: "var(--font-jakarta)",
                textDecoration: "none",
              }}
            >
              <Home className="w-3.5 h-3.5" />
              Volver al marketplace
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
