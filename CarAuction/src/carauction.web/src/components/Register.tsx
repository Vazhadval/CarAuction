import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import { UserRegistration } from '../types';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const { firstName, lastName, email, password, confirmPassword } = formData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('პაროლები არ ემთხვევა');
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        confirmPassword
      } as UserRegistration);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'რეგისტრაცია ვერ მოხერხდა. გთხოვთ, კვლავ სცადეთ.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center">
      <div className="col-md-6">
        <h2 className="mb-4">რეგისტრაცია</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && (
          <Alert variant="success">
            რეგისტრაცია წარმატებით დასრულდა! გადამისამართება შესვლის გვერდზე...
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formFirstName">
            <Form.Label>სახელი</Form.Label>
            <Form.Control
              type="text"
              name="firstName"
              placeholder="შეიყვანეთ სახელი"
              value={firstName}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formLastName">
            <Form.Label>გვარი</Form.Label>
            <Form.Control
              type="text"
              name="lastName"
              placeholder="შეიყვანეთ გვარი"
              value={lastName}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>ელ-ფოსტის მისამართი</Form.Label>
            <Form.Control
              type="email"
              name="email"
              placeholder="შეიყვანეთ ელ-ფოსტა"
              value={email}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>პაროლი</Form.Label>
            <Form.Control
              type="password"
              name="password"
              placeholder="პაროლი"
              value={password}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formConfirmPassword">
            <Form.Label>პაროლის დადასტურება</Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              placeholder="დაადასტურეთ პაროლი"
              value={confirmPassword}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? 'რეგისტრირდება...' : 'რეგისტრაცია'}
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default Register;
