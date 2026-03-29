export async function onRequest(context) {
  const { request, env, next } = context;
  const authorization = request.headers.get("Authorization");

  if (authorization) {
    const [scheme, encoded] = authorization.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      const correctPass = env.CFP_PASSWORD || "Tetsuo314!";
      const correctUser = env.CFP_USERNAME || "TKosuge";
      if (user === correctUser && pass === correctPass) {
        return next();
      }
    }
  }

  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SPY Tracker"' },
  });
}
