// Logged-in area: render per request (pages use live user data and useSearchParams), never prerender at build.
export const dynamic = 'force-dynamic'

export default function Layout({ children }) {
  return children
}
