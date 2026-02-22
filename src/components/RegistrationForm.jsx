import { useState } from 'react';
import { AlertCircle, Lock, Mail, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function RegistrationForm({ onRegistered }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      setError('Please enter a valid email and password (minimum 6 characters).');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (response.status === 201) {
        const payload = await response.json();
        onRegistered?.(payload.user);
        window.location.assign('/');
        return;
      }

      if (response.status === 409) {
        setError('Email already exists');
        return;
      }

      if (response.status === 400 || response.status >= 500) {
        setError('Registration failed. Please try again.');
        return;
      }

      setError('Registration failed. Please try again.');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UserPlus className="h-4 w-4" />
        Register
      </div>

      <div className="space-y-1">
        <Label htmlFor="register-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="register-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="register-password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="register-password"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            minLength={6}
          />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Create account'}
      </Button>
    </form>
  );
}
