import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("bookings", "routes/pages/bookings.tsx"),
] satisfies RouteConfig;
