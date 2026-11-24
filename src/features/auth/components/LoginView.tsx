import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Church, KeyRound, Mail, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChurchAuthStore } from "@/stores/church-auth.store";
import { getApiErrorMessage } from "@/lib/utils";
import { authService } from "../services/auth.service";
import { InstallAppBanner } from "./InstallAppBanner";

const codeSchema = z.object({
  access_code: z.string().trim().min(4, "Ingresa el código de tu ministerio (ej. MIN-8E4D5B)"),
  volunteer_name: z.string().trim().min(2, "Ingresa tu nombre para identificarte"),
});

const emailSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z.string().min(4, "Ingresa tu contraseña"),
});

type CodeForm = z.infer<typeof codeSchema>;
type EmailForm = z.infer<typeof emailSchema>;

export function LoginView() {
  const navigate = useNavigate();
  const loginSatellite = useChurchAuthStore((s) => s.loginSatellite);
  const loginAdmin = useChurchAuthStore((s) => s.loginAdmin);

  const [mode, setMode] = useState<"code" | "email">("code");
  const [emailRole, setEmailRole] = useState<"leader" | "admin">("leader");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
    defaultValues: { access_code: "", volunteer_name: "" },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });

  const onCodeSubmit = async (values: CodeForm) => {
    setIsSubmitting(true);
    try {
      const res = await authService.loginByCode({
        access_code: values.access_code.toUpperCase(),
        volunteer_name: values.volunteer_name,
      });
      loginSatellite(res);
      toast.success(`Bienvenido(a), ${res.volunteer_name}`);
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Código inválido o ministerio inactivo"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEmailSubmit = async (values: EmailForm) => {
    setIsSubmitting(true);
    try {
      if (emailRole === "leader") {
        const res = await authService.loginByEmail(values);
        loginSatellite(res);
        toast.success(`Bienvenido(a), ${res.volunteer_name}`);
        await navigate({ to: "/" });
      } else {
        const res = await authService.loginKlaroContaAdmin(values);
        const userRole = (res.user?.name_rol || "").toUpperCase();
        if (!res.user?.has_church_module) {
          toast.error("Esta organización no tiene habilitado el Módulo de Iglesias en KlaroConta.");
          return;
        }
        if (userRole !== "ADMIN" && userRole !== "EMPRESA") {
          toast.error("Solo usuarios Pastor/Administrador (ADMIN o EMPRESA) pueden acceder por este modo.");
          return;
        }
        const [branches, ministries] = await Promise.all([
          authService.listBranchesWithToken(res.access_token),
          authService.listMinistriesWithToken(res.access_token),
        ]);
        loginAdmin(res, branches, ministries);
        toast.success(`Bienvenido(a), ${res.user.full_name}`);
        await navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#090d16] relative overflow-hidden flex flex-col justify-center px-4 py-8">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-600/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-emerald-500/25 border border-white/15 flex items-center justify-center shadow-xl shadow-indigo-950/60">
            <Church className="h-8 w-8 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">KlaroIglesia</h1>
          <p className="text-xs text-slate-400">
            Gestión Ministerial Mobile-First · Conectado a KlaroConta
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-white/10">
          <button
            type="button"
            onClick={() => setMode("code")}
            className={`min-h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "code"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <span>Me dieron un código</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`min-h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "email"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span>Correo y clave</span>
          </button>
        </div>

        <Card className="p-1">
          <CardContent className="p-4 space-y-4">
            {mode === "code" ? (
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="access_code">Código de Ministerio</Label>
                  <Input
                    id="access_code"
                    placeholder="Ej. MIN-8E4D5B"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    className="uppercase font-mono tracking-wider text-base"
                    {...codeForm.register("access_code", {
                      onChange: (e) => {
                        e.target.value = e.target.value.toUpperCase();
                      },
                    })}
                  />
                  {codeForm.formState.errors.access_code && (
                    <p className="text-xs text-rose-400">
                      {codeForm.formState.errors.access_code.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="volunteer_name">Tu Nombre</Label>
                  <Input
                    id="volunteer_name"
                    placeholder="Ej. Hermana Luz"
                    {...codeForm.register("volunteer_name")}
                  />
                  {codeForm.formState.errors.volunteer_name && (
                    <p className="text-xs text-rose-400">
                      {codeForm.formState.errors.volunteer_name.message}
                    </p>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Entrar a mi Ministerio
                </Button>
              </form>
            ) : (
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                {/* Leader vs Pastor/Admin sub-selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailRole("leader")}
                    className={`min-h-11 rounded-xl border px-2.5 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      emailRole === "leader"
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                        : "border-white/10 bg-slate-950/50 text-slate-400"
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>Líder Ministerio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailRole("admin")}
                    className={`min-h-11 rounded-xl border px-2.5 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      emailRole === "admin"
                        ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200"
                        : "border-white/10 bg-slate-950/50 text-slate-400"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>Pastor / Admin</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {emailRole === "leader"
                    ? "Usa tu usuario de ministerio creado en KlaroConta (aislado a tu ministerio)."
                    : "Usa tu cuenta de KlaroConta (ADMIN / EMPRESA) para acceder a todas las sedes y ministerios."}
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="correo@iglesia.org"
                    {...emailForm.register("email")}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-rose-400">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...emailForm.register("password")}
                  />
                  {emailForm.formState.errors.password && (
                    <p className="text-xs text-rose-400">
                      {emailForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {emailRole === "leader" ? "Entrar como Líder" : "Entrar como Administrador"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <InstallAppBanner />
      </div>
    </div>
  );
}
