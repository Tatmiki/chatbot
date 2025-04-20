'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');

    // Verifica se está registrando ou fazendo login
    if (isRegistering) {
      // Registro
      const response = await fetch('http://localhost:8000/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // Envia o e-mail e a senha
      });

      if (response.ok) {
        // Agora faz o login automaticamente
        const loginResponse = await fetch('http://localhost:8000/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
    
        if (loginResponse.ok) {
          const data = await loginResponse.json();
          localStorage.setItem('auth', data.email); // salva o email no localStorage
          router.push('/dashboard');
        } else {
          setError('Erro ao fazer login após cadastro');
        }
      } else {
        setError('Erro ao cadastrar usuário');
      }
    } else {
      // Login
      const response = await fetch('http://localhost:8000/login', { // Endpoint para login
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // Envia e-mail e senha para autenticação
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth', data.email); // Armazena o e-mail no localStorage
        router.push('/dashboard');
      } else {
        setError('Credenciais inválidas');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isRegistering ? 'Cadastrar' : 'Login'}
        </h1>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              {showPassword ? (
                <EyeOff
                  className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 cursor-pointer"
                  onClick={() => setShowPassword(false)}
                />
              ) : (
                <Eye
                  className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 cursor-pointer"
                  onClick={() => setShowPassword(true)}
                />
              )}
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="•••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button className="w-full mt-2" onClick={handleAuth}>
            {isRegistering ? 'Cadastrar e Entrar' : 'Entrar'}
          </Button>

          <p className="text-center text-sm mt-4">
            {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <span
              className="text-blue-500 cursor-pointer underline"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
            >
              {isRegistering ? 'Fazer login' : 'Cadastrar-se'}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
