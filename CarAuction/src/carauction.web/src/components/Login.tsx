import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLogin: (userData: User, token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      onLogin(response.data.user, response.data.token);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'შესვლა ვერ მოხერხდა. გთხოვთ, შეამოწმეთ თქვენი მონაცემები და კვლავ სცადეთ.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center">
      <div className="col-md-6">
        <h2 className="mb-4">შესვლა</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>ელ-ფოსტის მისამართი</Form.Label>
            <Form.Control
              type="email"
              placeholder="შეიყვანეთ ელ-ფოსტა"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>პაროლი</Form.Label>
            <Form.Control
              type="password"
              placeholder="პაროლი"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'შედის...' : 'შესვლა'}
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default Login;
