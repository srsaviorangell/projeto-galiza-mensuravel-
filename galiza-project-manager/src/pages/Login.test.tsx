import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { AppProvider } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import '@testing-library/jest-dom';

vi.mock('../lib/googleAuth');

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AppProvider>
        <Login />
      </AppProvider>
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar a página de login corretamente', () => {
    renderLogin();
    
    expect(screen.getByText(/galiza/i)).toBeInTheDocument();
    expect(screen.getByText(/gestão de atividades/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail corporativo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar com google/i })).toBeInTheDocument();
  });

  it('deve mostrar erro quando email não for do domínio @galizanet.com.br', async () => {
    renderLogin();
    
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'teste@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/apenas emails.*galizanet.com.br.*são permitidos/i)).toBeInTheDocument();
    });
  });

  it('deve aceitar email do domínio correto', () => {
    renderLogin();
    
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    
    fireEvent.change(emailInput, { target: { value: 'teste@galizanet.com.br' } });
    
    expect(emailInput).toHaveValue('teste@galizanet.com.br');
  });

  it('deve alternar visibilidade da senha', () => {
    renderLogin();
    
    const passwordInput = screen.getByLabelText(/senha/i);
    const toggleButton = screen.getByRole('button', { name: /visibility/i });

    expect(passwordInput).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('deve chamar função de login com credenciais corretas', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: '123', email: 'teste@galizanet.com.br' } },
      error: null
    });

    renderLogin();
    
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'teste@galizanet.com.br' } });
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'teste@galizanet.com.br',
        password: '123456'
      });
    });
  });

  it('deve mostrar mensagem de erro quando login falhar', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: null,
      error: { message: 'Credenciais inválidas' }
    });

    renderLogin();
    
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'teste@galizanet.com.br' } });
    fireEvent.change(passwordInput, { target: { value: 'senha-errada' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    });
  });

  it('deve mostrar botão de login com Google', () => {
    renderLogin();
    
    const googleButton = screen.getByRole('button', { name: /entrar com google/i });
    expect(googleButton).toBeInTheDocument();
  });

  it('deve chamar Google Auth quando botão for clicado', async () => {
    vi.mocked(signInWithGoogle).mockResolvedValue({
      success: true,
      url: 'http://supabase-url.com/auth/callback'
    });

    renderLogin();
    
    const googleButton = screen.getByRole('button', { name: /entrar com google/i });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled();
    });
  });

  it('deve mostrar modo de primeiro acesso quando clicar em Cadastrar', () => {
    renderLogin();
    
    const cadastrarButton = screen.getByRole('button', { name: /cadastrar/i });
    fireEvent.click(cadastrarButton);

    expect(screen.getByText(/primeiro acesso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail corporativo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha provisória/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument();
  });

  it('deve voltar para login após estar em modo de primeiro acesso', () => {
    renderLogin();
    
    const cadastrarButton = screen.getByRole('button', { name: /cadastrar/i });
    fireEvent.click(cadastrarButton);

    const voltarButton = screen.getByRole('button', { name: /fazer login/i });
    fireEvent.click(voltarButton);

    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('botão de submit deve estar habilitado', () => {
    renderLogin();
    
    const submitButtons = screen.getAllByRole('button', { name: /entrar/i });
    expect(submitButtons[0]).toBeEnabled();
  });

  it('deve mostrar estado de loading durante submit', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderLogin();
    
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getAllByRole('button', { name: /entrar/i })[0];

    fireEvent.change(emailInput, { target: { value: 'teste@galizanet.com.br' } });
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /entrando/i })).toBeInTheDocument();
    });
  });
});

describe('Validações do Formulário', () => {
  it('deve aceitar email com domínio @galizanet.com.br', () => {
    renderLogin();
    
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    
    fireEvent.change(emailInput, { target: { value: 'usuario@galizanet.com.br' } });
    expect(emailInput).toHaveValue('usuario@galizanet.com.br');
  });
});
