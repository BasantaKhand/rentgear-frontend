import { Link } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

function Login() {
  return (
    <div className="main-content">
      <div className="form-card">
        <div className="form-header">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <div className="logo-icon">R</div>
            RentGear
          </div>
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
        </div>
        <form>
          <Input label="Email address" type="email" name="email" placeholder="Enter your email" />
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Enter your password"
          />
          <Button variant="primary" style={{ width: '100%' }}>
            Sign In
          </Button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
