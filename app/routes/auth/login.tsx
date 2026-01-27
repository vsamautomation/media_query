import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Login attempt:", { email, password });
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background with gradient and decorative elements */}
      <div className="absolute inset-0 bg-linear-to-b from-sky-100 via-sky-50 to-white">
        {/* Decorative arc rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200">
          <div className="absolute inset-0 rounded-full border border-primary/10" />
          <div className="absolute inset-8 rounded-full border border-primary/5" />
          <div className="absolute inset-16 rounded-full border border-primary/5" />
        </div>

        {/* Cloud-like shapes using clip-path */}
        <div
          className="absolute bottom-0 left-0 right-0 h-64 bg-linear-to-t from-white/80 to-transparent"
          style={{
            clipPath: "ellipse(120% 100% at 50% 100%)"
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-1/2 h-48 bg-white/40"
          style={{
            clipPath: "ellipse(100% 100% at 0% 100%)"
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-1/2 h-48 bg-white/40"
          style={{
            clipPath: "ellipse(100% 100% at 100% 100%)"
          }}
        />

        {/* Subtle floating shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-32 w-24 h-24 bg-sky-200/50 rounded-full blur-2xl" />
        <div className="absolute bottom-40 left-1/4 w-40 h-40 bg-sky-100/50 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo centered above card */}
          <div className="flex justify-center mb-8">
            <img
              src="/assets/images/logos/splash-icon-dark.png"
              alt="Clengo"
              className="h-60 w-auto"
            />
          </div>

          {/* Login Card with glassmorphism */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-primary/5 border border-white/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Welcome Back
              </h1>
              {/* <p className="text-muted-foreground text-sm">
                Access your dashboard to manage tasks and teams together.
              </p> */}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-white bg-destructive rounded-xl">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  className="pl-11 h-12 bg-slate-100/80 border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="pl-11 pr-11 h-12 bg-slate-100/80 border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium text-base mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
