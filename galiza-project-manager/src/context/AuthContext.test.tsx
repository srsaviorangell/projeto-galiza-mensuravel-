import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AuthContext - Gerenciamento de Estado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com isLoading true e depois false', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.value.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });
  });

  it('deve ter currentUser null quando não há sessão', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.currentUser).toBeNull();
    });
  });

  it('deve ter isAdmin false por padrão', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isAdmin).toBe(false);
    });
  });

  it('deve ter isFirstAccess false por padrão', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isFirstAccess).toBe(false);
    });
  });
});

describe('AuthContext - Operações de Tarefas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve adicionar nova tarefa com sucesso', async () => {
    const mockTask = {
      title: 'Nova Tarefa',
      description: 'Descrição da tarefa',
      status: 'A Fazer',
      projectId: 1
    };

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: [{ id: 1, ...mockTask }]
      }),
      select: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let addTaskResult;
    await act(async () => {
      addTaskResult = await result.value.addTask(mockTask);
    });

    expect(addTaskResult?.success).toBe(true);
  });

  it('deve atualizar tarefa existente', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockResolvedValue({}),
      eq: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.value.updateTask(1, { status: 'Concluída' });
    });

    expect(updateResult?.success).toBe(true);
  });

  it('deve deletar tarefa', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockResolvedValue({}),
      eq: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let deleteResult;
    await act(async () => {
      deleteResult = await result.value.deleteTask(1);
    });

    expect(deleteResult?.success).toBe(true);
  });
});

describe('AuthContext - Operações de Projeto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve adicionar novo projeto', async () => {
    const mockProject = {
      name: 'Projeto Teste',
      status: 'Em andamento',
      progress: 0
    };

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: [{ id: 1, ...mockProject }]
      }),
      select: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let addProjectResult;
    await act(async () => {
      addProjectResult = await result.value.addProject(mockProject);
    });

    expect(addProjectResult?.success).toBe(true);
  });

  it('deve atualizar projeto existente', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockResolvedValue({}),
      eq: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.value.updateProject(1, { progress: 50 });
    });

    expect(updateResult?.success).toBe(true);
  });

  it('deve deletar projeto', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockResolvedValue({}),
      eq: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let deleteResult;
    await act(async () => {
      deleteResult = await result.value.deleteProject(1);
    });

    expect(deleteResult?.success).toBe(true);
  });
});

describe('AuthContext - Operações de Usuário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve fazer logout corretamente', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    await act(async () => {
      await result.value.logout();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('deve adicionar novo usuário com sucesso', async () => {
    const mockUserData = {
      email: 'novo@galizanet.com.br',
      name: 'Novo Usuário',
      role: 'user'
    };

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: '789' } },
      error: null
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({}),
      select: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let addResult;
    await act(async () => {
      addResult = await result.value.addUser(mockUserData);
    });

    expect(addResult?.success).toBe(true);
  });

  it('deve atualizar usuário', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockResolvedValue({}),
      eq: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.value.updateUser('123', { name: 'Nome Atualizado' });
    });

    expect(updateResult?.success).toBe(true);
  });

  it('deve deletar usuário', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockResolvedValue({}),
      eq: vi.fn()
    } as any);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    let deleteResult;
    await act(async () => {
      deleteResult = await result.value.deleteUser('123');
    });

    expect(deleteResult?.success).toBe(true);
  });
});

describe('AuthContext - Estatísticas', () => {
  it('deve ter stats iniciais', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    expect(result.value.stats).toBeDefined();
    expect(result.value.stats.totalProjects).toBe(0);
    expect(result.value.stats.completedTasks).toBe(0);
    expect(result.value.stats.pendingTasks).toBe(0);
  });

  it('deve ter userStats iniciais', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => {
      expect(result.value.isLoading).toBe(false);
    });

    expect(result.value.userStats).toBeDefined();
  });
});
