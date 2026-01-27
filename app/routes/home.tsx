import type { Route } from "./+types/home";
import { Login } from "./auth/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - Clengo" },
    { name: "description", content: "Sign in to your Clengo account" },
  ];
}

export default function Home() {
  return <Login />;
}
