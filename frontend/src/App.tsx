import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Lobby } from './pages/Lobby';
import { Arena } from './pages/Arena';
import { Analysis } from './pages/Analysis';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
