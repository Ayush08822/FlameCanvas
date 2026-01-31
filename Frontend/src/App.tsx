import { useState } from 'react';
import './App.css'
import Login from './components/Login';
import DrawingCanvas from './components/DrawingCanvas';

const App = () => {
  const [username, setUsername] = useState<string | null>(null);

  return (
    <>
        <DrawingCanvas  />
    </>
  );
};

export default App
