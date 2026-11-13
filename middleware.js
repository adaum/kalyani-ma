export const config = {
  matcher: '/preview-k92x/:path*',
};

export default function middleware(request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const base64Credentials = authHeader.split(' ')[1];
    const [user, password] = atob(base64Credentials).split(':');

    if (user === 'reviewer' && password === 'Kalyani') {
      return;
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Kalyani Staging"',
    },
  });
}