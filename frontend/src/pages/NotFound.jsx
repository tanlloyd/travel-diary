import { Link } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'

function NotFound() {
  return (
    <PageLayout>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Return home</Link>
    </PageLayout>
  )
}

export default NotFound
