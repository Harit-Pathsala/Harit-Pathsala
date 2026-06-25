import React, { useState, useEffect } from 'react';
import { animate } from 'animejs';
import Navbar from './components/Navbar.jsx';
import Icon from './components/Icons.jsx';
import CalculatorPage from './components/Calculator.jsx';
import BiomeExplorer from './components/BiomeExplorer.jsx';
import NepalMissionMap from './components/NepalMissionMap.jsx';
import NepalMap3D from './components/NepalMap3D.jsx';
import NepalAdventureMap from './components/NepalAdventureMap.jsx';
import NepalAdventureMap3D from './components/NepalAdventureMap3D.jsx';
import NepalQuestMap from './components/NepalQuestMap.jsx';
import StoryIntro from './components/StoryIntro.jsx';
import WorldHeal from './components/WorldHeal.jsx';
import WorldHub from './components/WorldHub.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import LanguageSelect from './components/LanguageSelect.jsx';
import GameShell from './components/GameShell.jsx';
import CommuteMission from './components/CommuteMission.jsx';
import PowerPatrolMission from './components/PowerPatrolMission.jsx';
import CookingMission from './components/CookingMission.jsx';
import LakeCleanupMission from './components/LakeCleanupMission.jsx';
import FloodWatchMission from './components/FloodWatchMission.jsx';
import CarryOutMission from './components/CarryOutMission.jsx';
import WasteSortMission from './components/WasteSortMission.jsx';
import JungleMission from './components/JungleMission.jsx';
import AskBanaPage from './components/AskBana.jsx';
import EcoWorld from './components/EcoWorld.jsx';
import Login from './components/Login.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import TeacherDashboard from './components/TeacherDashboard.jsx';
import StudentProfile from './components/StudentProfile.jsx';
import { LanguageProvider } from './i18n.jsx';
import { AuthProvider, useAuth } from './data/auth.jsx';
import { useGameStore } from './state/gameStore.ts';
import { sfx } from './game/sfx.js';

// Catches any render error so the page never goes blank silently.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Harit Pathsala render error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="card">
            <h2 style={{ color: 'var(--danger)' }}>Something went wrong rendering this view.</h2>
            <p className="muted" style={{ fontWeight: 700 }}>Open the browser console for details. You can switch tabs to recover.</p>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem' }}>{String(this.state.error)}</pre>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => this.setState({ error: null })}>Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Missions that have a real implementation; map pins for the rest are "coming soon".
const MISSION_COMPONENTS = {
  m1: { Comp: CommuteMission, props: { missionId: 'butwal' } },
  m_dd: { Comp: CommuteMission, props: { missionId: 'dadeldhura' } },
  m2: { Comp: PowerPatrolMission, props: {} },
  cook: { Comp: CookingMission, props: {} },
  m3: { Comp: LakeCleanupMission, props: {} },
  m6: { Comp: FloodWatchMission, props: {} },
  m5: { Comp: CarryOutMission, props: {} },
  m8: { Comp: WasteSortMission, props: {} },
  jungle: { Comp: JungleMission, props: {} },
};

function StudentApp() {
  const [tab, setTab] = useState('map');
  const [route, setRoute] = useState(null); // null | {kind:'explorer',level} | {kind:'mission',missionId}
  const [showStory, setShowStory] = useState(true); // 3D storyboard plays when the Map opens
  const pendingHeal = useGameStore((s) => s.pendingHeal);
  const clearPendingHeal = useGameStore((s) => s.clearPendingHeal);

  // ambient music bed — plays on the main screens; pauses during the narrated story intro and
  // inside missions/explorer (those have their own adaptive ambient via the cue engine)
  useEffect(() => {
    if (!showStory && !route) sfx.startMusic(); else sfx.stopMusic();
    return () => sfx.stopMusic();
  }, [showStory, route]);

  const goTab = (t) => { setRoute(null); setTab(t); if (t === 'map') setShowStory(true); };

  const renderMap = () => {
    if (!route) {
      if (pendingHeal) return <WorldHeal from={pendingHeal.from} to={pendingHeal.to} onDone={clearPendingHeal} />;
      if (showStory) return <StoryIntro onDone={() => setShowStory(false)} />;
      return (
        <NepalQuestMap
          onExplorer={(level) => setRoute({ kind: 'explorer', level })}
          onMission={(missionId) => setRoute({ kind: 'mission', missionId })}
        />
      );
    }
    if (route.kind === 'explorer') {
      return (<GameShell route={route} onExit={() => setRoute(null)}><BiomeExplorer initialLevel={route.level} /></GameShell>);
    }
    const m = MISSION_COMPONENTS[route.missionId];
    if (m) { const C = m.Comp; return (<GameShell route={route} onExit={() => setRoute(null)}><C {...m.props} /></GameShell>); }
    return null;
  };

  const boundaryKey = tab + (route ? `:${route.kind}:${route.level ?? route.missionId}` : '');

  return (
    <div className="app">
      <Navbar tab={tab} setTab={goTab} />
      <ErrorBoundary key={boundaryKey}>
        {tab === 'profile' && <StudentProfile onPlay={(t) => goTab(t || 'map')} />}
        {tab === 'calc' && <CalculatorPage />}
        {tab === 'map' && renderMap()}
        {tab === 'world' && <WorldHub />}
        {tab === 'ask' && <AskBanaPage />}
      </ErrorBoundary>
      {tab !== 'map' && tab !== 'world' && (
        <footer className="footer">
          हरित पाठशाला · Harit Pathsala — Green School · Built for Nepal's students · Powered by correct science · Runs on your school laptop
        </footer>
      )}
    </div>
  );
}

// chooses what to show based on boot, language, and who is logged in
function Shell({ booting, langChosen, onPickLang }) {
  const { user, ready } = useAuth();
  if (booting || !ready) return <LoadingScreen />;
  if (!langChosen) return <LanguageSelect onPick={onPickLang} />;
  if (!user) return <Login />;
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'teacher') return <TeacherDashboard />;
  return <StudentApp />;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [langChosen, setLangChosen] = useState(false); // entry-screen language gate
  useEffect(() => { const t = setTimeout(() => setBooting(false), 1600); return () => clearTimeout(t); }, []);

  // app-wide UI click sounds + subtle tap-pop on every primary (.btn) button
  useEffect(() => {
    const onClick = (e) => {
      const t = e.target; if (!t || !t.closest) return;
      const b = t.closest('button, .btn, .choice, .mcq-opt, [role="button"]');
      if (b) {
        sfx.resume();
        if (!b.closest('[data-sfx-silent]')) {
          if (b.classList && b.classList.contains('tab')) sfx.tab();
          else if (b.classList && (b.classList.contains('choice') || b.classList.contains('mcq-opt'))) sfx.select();
          else sfx.click();
        }
      }
      const pop = t.closest('.btn');
      if (pop) animate(pop, { scale: [0.94, 1], duration: 240, ease: 'out(2)' });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <Shell booting={booting} langChosen={langChosen} onPickLang={() => setLangChosen(true)} />
      </AuthProvider>
    </LanguageProvider>
  );
}
