import React, { useState, useEffect } from 'react';
import { ActiveScreen, FichaTCC, User } from './types';
import { storageService } from './services/storage';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { MainDashboard } from './components/MainDashboard';
import { FichaForm } from './components/FichaForm';
import { FichaPreview } from './components/FichaPreview';
import { PreviewWithExport } from './components/PreviewWithExport';
import { HistoricoScreen } from './components/HistoricoScreen';
import { ConsultaOrientadorScreen } from './components/ConsultaOrientadorScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('main');
  const [fichas, setFichas] = useState<FichaTCC[]>([]);
  const [activeFicha, setActiveFicha] = useState<FichaTCC | null>(null);

  // Initial screen must ALWAYS be the Login Screen (do not auto-login on startup)
  useEffect(() => {
    // We clear any auto-login session so user explicitly starts at Login
    setUser(null);
    loadFichasData(null);
  }, []);

  const loadFichasData = (currentUser?: User | null) => {
    const activeUser = currentUser !== undefined ? currentUser : user;
    const allFichas = storageService.getFichas();
    setFichas(allFichas);

    const activeId = storageService.getActiveFichaId();
    if (activeUser?.role === 'aluno') {
      // Robust student ficha recovery
      const studentFicha = storageService.getStudentFicha(activeUser);
      setActiveFicha(studentFicha);
      const updatedAll = storageService.getFichas();
      setFichas(updatedAll);
    } else {
      const found = (activeId ? allFichas.find((f) => f.id === activeId) : null) || allFichas[0] || null;
      setActiveFicha(found);
    }
  };

  const handleLoginSuccess = (loggedUser: User) => {
    storageService.setLoggedUser(loggedUser);
    storageService.recordUserAccess(loggedUser);
    setUser(loggedUser);
    loadFichasData(loggedUser);
    setActiveScreen('main');
  };

  const handleLogout = () => {
    storageService.logoutUser();
    setUser(null);
    setActiveScreen('main');
  };

  const handleSaveFicha = (updatedFicha: FichaTCC) => {
    storageService.saveFicha(updatedFicha);
    setActiveFicha(updatedFicha);
    const refreshed = storageService.getFichas();
    setFichas(refreshed);
  };

  const handleCreateNew = () => {
    if (!user) return;
    const newFicha = storageService.createNewFicha(user);
    loadFichasData();
    setActiveFicha(newFicha);
    setActiveScreen('editar');
  };

  const handleSelectFichaFromHistory = (
    id: string,
    action: 'editar' | 'preview'
  ) => {
    const selected = storageService.getFichaById(id);
    if (selected) {
      storageService.setActiveFichaId(id);
      setActiveFicha(selected);
      setActiveScreen(action);
    }
  };

  const handleDeleteFicha = (id: string) => {
    storageService.deleteFicha(id);
    loadFichasData();
  };

  // 1. Separate Login Screen Gate
  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Fallback if no active ficha exists
  const currentFicha = activeFicha || (fichas[0] ?? storageService.createNewFicha(user));

  return (
    <div className="min-h-screen bg-[#070C18] font-sans text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        user={user}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {activeScreen === 'main' && (
          <MainDashboard
            user={user}
            activeFicha={currentFicha}
            onNavigate={setActiveScreen}
            onCreateNew={handleCreateNew}
          />
        )}

        {activeScreen === 'consulta' && (
          <ConsultaOrientadorScreen
            currentUser={user}
            fichas={fichas}
            onSaveFicha={handleSaveFicha}
            onDeleteFicha={handleDeleteFicha}
            onSelectFichaForPreview={(ficha) => {
              setActiveFicha(ficha);
              setActiveScreen('preview');
            }}
            onNavigateToEdit={(ficha) => {
              setActiveFicha(ficha);
              setActiveScreen('editar');
            }}
            onNavigateMain={() => setActiveScreen('main')}
          />
        )}

        {activeScreen === 'editar' && (
          <FichaForm
            ficha={currentFicha}
            currentUser={user}
            onSave={handleSaveFicha}
            onPreview={() => setActiveScreen('preview')}
            onNavigateMain={() => setActiveScreen('main')}
          />
        )}

        {activeScreen === 'preview' && (
          <PreviewWithExport
            ficha={currentFicha}
            onNavigateMain={() => setActiveScreen('main')}
            onNavigateEdit={() => setActiveScreen('editar')}
          />
        )}

        {activeScreen === 'historico' && user.role === 'orientador' && (
          <HistoricoScreen
            fichas={fichas}
            activeFichaId={currentFicha.id}
            currentUser={user}
            onSelectFicha={handleSelectFichaFromHistory}
            onRefreshFichas={loadFichasData}
            onCreateNew={handleCreateNew}
          />
        )}
      </main>

      {/* Global off-screen canvas element for PDF generation from any screen */}
      <div
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '0px',
          width: '794px',
          zIndex: -9999,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      >
        <div style={{ width: '794px', backgroundColor: '#ffffff' }}>
          <FichaPreview ficha={currentFicha} idToCapture="global-export-preview-canvas" />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 text-center no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-300">
            Project Maker - Faculdade Faatesp.
          </p>
          <p className="text-[11px] text-slate-300 font-bold">
            2026 - Todos os direitos reservados by Mister Roger
          </p>
        </div>
      </footer>
    </div>
  );
}
