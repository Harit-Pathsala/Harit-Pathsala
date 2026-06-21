import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Icon from './components/Icons.jsx';
import CalculatorPage from './components/Calculator.jsx';
import BiomeExplorer from './components/BiomeExplorer.jsx';
import NepalMissionMap from './components/NepalMissionMap.jsx';
import NepalMap3D from './components/NepalMap3D.jsx';
import NepalAdventureMap from './components/NepalAdventureMap.jsx';
import NepalAdventureMap3D from './components/NepalAdventureMap3D.jsx';
import NepalQuestMap from './components/NepalQuestMap.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import GameShell from './components/GameShell.jsx';
import CommuteMission from './components/CommuteMission.jsx';
import PowerPatrolMission from './components/PowerPatrolMission.jsx';
import CookingMission from './components/CookingMission.jsx';
import LakeCleanupMission from './components/LakeCleanupMission.jsx';
import FloodWatchMission from './components/FloodWatchMission.jsx';
import CarryOutMission from './components/CarryOutMission.jsx';
import WasteSortMission from './components/WasteSortMission.jsx';
import AskBanaPage from './components/AskBana.jsx';
import EcoWorld from './components/EcoWorld.jsx';
import { LanguageProvider } from './i18n.jsx';
import { useGameStore } from './state/gameStore.ts';

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
};

export default function App() {
  const [tab, setTab] = useState('map');
  const [booting, setBooting] = useState(true);
  const [route, setRoute] = useState(null); // null | {kind:'explorer',level} | {kind:'mission',missionId}
  const hydrate = useGameStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { const t = setTimeout(() => setBooting(false), 1600); return () => clearTimeout(t); }, []);

  const goTab = (t) => { setRoute(null); setTab(t); };

  const renderMap = () => {
    if (!route) {
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
    <LanguageProvider>
      {booting && <LoadingScreen />}
      <div className="app">
        <Navbar tab={tab} setTab={goTab} />
        <ErrorBoundary key={boundaryKey}>
          {tab === 'calc' && <CalculatorPage />}
          {tab === 'map' && renderMap()}
          {tab === 'world' && <EcoWorld />}
          {tab === 'ask' && <AskBanaPage />}
        </ErrorBoundary>
        <footer className="footer">
          हरित पाठशाला · Harit Pathsala — Green School · Built for Nepal's students · Powered by correct science · Runs on your school laptop
        </footer>
      </div>
    </LanguageProvider>
  );
}
