import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { getActor } from "../lib/site-auth";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url);
    const publicPath = url.pathname === "/login" || url.pathname === "/api/session" || url.pathname === "/api/admin/session" || url.pathname === "/favicon.svg" || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/@") || url.pathname.startsWith("/__vite");
    // Anyone may view the calendar; adding, editing and the other pages still need a login.
    const publicRead = request.method === "GET" && (url.pathname === "/" || url.pathname === "/api/attendance" || url.pathname === "/api/roster");
    if (!publicPath) {
      const actor = await getActor(request);
      if (!actor && !publicRead) {
        if (url.pathname.startsWith("/api/")) return Response.json({ error: "로그인이 필요해요." }, { status: 401, headers: { "Cache-Control": "no-store" } });
        return Response.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url), 303);
      }
      if (actor?.mustChangePassword && url.pathname !== "/account" && url.pathname !== "/api/account") {
        if (url.pathname.startsWith("/api/")) return Response.json({ error: "첫 로그인 비밀번호를 변경해 주세요.", passwordChangeRequired: true }, { status: 403, headers: { "Cache-Control": "no-store" } });
        return Response.redirect(new URL("/account", url), 303);
      }
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    if (!publicPath) {
      const protectedResponse = new Response(response.body, response);
      protectedResponse.headers.set("Cache-Control", "private, no-store");
      protectedResponse.headers.append("Vary", "Cookie");
      return protectedResponse;
    }
    return response;
  },
};
