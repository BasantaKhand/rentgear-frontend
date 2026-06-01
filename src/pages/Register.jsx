import { Link } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

function Register() {
  return (
    <div className="main-content">
      <div className="form-card">
        <div className="form-header">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <div className="logo-icon">R</div>
            RentGear
          </div>
          <h2>Create an account</h2>
          <p>Start renting equipment today</p>
        </div>
        <form>
          <Input label="Full name" type="text" name="name" placeholder="John Doe" />
          <Input label="Email address" type="email" name="email" placeholder="john@example.com" />
          <Input label="Phone number" type="tel" name="phone" placeholder="+1 (555) 000-0000" />
          <Input label="Password" type="password" name="password" placeholder="Create a strong password" />
          <Button variant="primary" style={{ width: '100%' }}>
            Create Account
          </Button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
