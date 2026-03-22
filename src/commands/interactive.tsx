import React, { useState, useEffect, memo } from 'react';
import { render, Box, Text, useInput, useApp, useStdout } from 'ink';
import chalk from 'chalk';
import { GoalsRepo } from '../data/repos/goals.repo.js';
import { GapsRepo } from '../data/repos/gaps.repo.js';
import { ScoresRepo } from '../data/repos/scores.repo.js';
import { storage } from '../lib/storage.js';
import { getProviderInstance, invokeModel } from '../lib/ai-provider.js';
import { GapMeter } from '../../packages/ink-ui/src/index.js';

// --- Cyberpunk / Sci-Fi Theming UI ---
const AMBER = '#EF9F27';
const TEAL = '#1D9E75';
const RED = '#E24B4A';
const MUTED = '#555550';
const BORDER = '#333333';
const BG_DARK = '#0a0a0a';

interface LogLine {
  type: 'cmd' | 'ok' | 'info' | 'warn' | 'system' | 'ai';
  text: string;
}

// --- Strict UI Math Components ---

const TopNav = memo(({ goal, gap, closedPct, rank }: any) => (
  <Box borderStyle="round" borderColor={BORDER} paddingX={1} justifyContent="space-between" height={3} flexShrink={0}>
    <Box>
      <Text color={AMBER} bold>GOAT_OS // </Text>
      <Text color={MUTED}>MISSION: </Text>
      <Text color="white" wrap="truncate-end">{goal || 'UNASSIGNED'}</Text>
    </Box>
    <Box>
      <Text color={MUTED}>GAP: </Text><Text color={AMBER}>{gap || '--'}</Text>
      <Text color={MUTED}> │ </Text>
      <Text color={MUTED}>CLOSED: </Text><Text color={TEAL}>{closedPct}%</Text>
      <Text color={MUTED}> │ </Text>
      <Text color={TEAL} bold>[{rank?.toUpperCase() || 'RECRUIT'}]</Text>
    </Box>
  </Box>
));

const LeftPanel = memo(({ current, target, unit, compact = false, height }: any) => (
  <Box flexDirection="column" width={32} height={height} paddingX={1} borderStyle="round" borderColor={BORDER} flexShrink={0} overflow="hidden">
    <Text color={MUTED} bold>TELEMETRY</Text>
    
    <Box marginY={1}>
      <GapMeter current={current} target={target} unit={unit} />
    </Box>
    
    <Box flexDirection="column" marginTop={1}>
      <Text color={MUTED}>VELOCITY</Text>
      <Text color={TEAL} bold>+14.2/wk</Text>
      
      <Box marginTop={1} flexDirection="column">
        <Text color={MUTED}>PROJECTION</Text>
        <Text color="white">Wk 14 (Nov 26)</Text>
      </Box>
    </Box>
    
    <Box flexGrow={1} justifyContent="flex-end" flexDirection="column">
       <Text color={MUTED}>SYSTEM STATUS</Text>
       <Text color={TEAL}>● NOMINAL</Text>
    </Box>
  </Box>
));

const RightPanel = memo(({ score, xp, compact = false, height }: any) => (
  <Box flexDirection="column" width={32} height={height} paddingX={1} borderStyle="round" borderColor={BORDER} flexShrink={0} overflow="hidden">
    <Text color={MUTED} bold>OPERATOR</Text>
    
    <Box marginY={1} flexDirection="column">
       <Text color={MUTED}>SCORE</Text>
       <Text color={AMBER} bold>{score}</Text>
    </Box>

    <Box flexDirection="column" marginTop={1}>
      <Text color={MUTED}>MOMENTUM</Text>
      <Text color={AMBER}>██████░░</Text>
      
      <Box marginTop={1} flexDirection="column">
        <Text color={MUTED}>SYNC RATE</Text>
        <Text color={TEAL}>████████</Text>
      </Box>
    </Box>

    <Box flexGrow={1} justifyContent="flex-end">
      <Box borderStyle="single" borderColor="#4a1515" width="100%" justifyContent="center">
        <Text color={RED} bold> ⚡ OVERRIDE</Text>
      </Box>
    </Box>
  </Box>
));

const StaticCursor = () => {
  return <Text color={AMBER}>█</Text>;
};

const CommandInput = ({ onSubmit, onExit, width }: { onSubmit: (text: string) => void, onExit: () => void, width: number }) => {
  const [input, setInput] = useState('');

  useInput((inputStr, key) => {
    if (key.return) {
      if (input.trim()) onSubmit(input);
      setInput('');
    } else if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
    } else if (key.escape) {
      onExit();
    } else if (inputStr && !key.ctrl && !key.meta) {
      setInput(prev => prev + inputStr);
    }
  });

  return (
    <Box borderStyle="round" borderColor={BORDER} paddingX={1} flexShrink={0} height={3}>
      <Text color={AMBER} bold># </Text>
      <Text color="white" wrap="truncate-end">{input.slice(0, width)}</Text>
      <StaticCursor />
    </Box>
  );
};

// --- Main Engine ---
const HUD = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [size, setSize] = useState({ rows: stdout.rows, columns: stdout.columns });
  
  // Real-time resizing support
  useEffect(() => {
    const handleResize = () => setSize({ rows: stdout.rows, columns: stdout.columns });
    stdout.on('resize', handleResize);
    return () => { stdout.off('resize', handleResize); };
  }, [stdout]);

  const [logs, setLogs] = useState<LogLine[]>([
    { type: 'system', text: 'boot sequence initiated...' },
    { type: 'system', text: 'goatbrain v2.6 loaded (anti-flicker mode).' },
    { type: 'info', text: 'awaiting operator input.' }
  ]);
  
  const [state, setState] = useState<any>({ 
    goal: null, gap: {current:0, target:100, unit:''}, score: {total:0, rank:'Recruit'} 
  });
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const goalId = await storage.get<string>('active_goal_id');
        if (goalId) {
          const goal = GoalsRepo.getById(goalId);
          const scores = ScoresRepo.getScores(goalId, 1);
          const totalScore = scores.reduce((sum: number, s: any) => sum + s.xp, 0);
          setState({
            goal: goal?.statement,
            gap: { current: goal?.currentVal || 0, target: goal?.targetVal || 100, unit: goal?.unit || '' },
            score: { total: totalScore, rank: scores[0]?.rank || 'Recruit' }
          });
        }
      } catch (e) {}
    };
    fetchData(); // Fetch once on load, no aggressive polling to prevent full-screen React diff repaints
  }, []);

  const addLog = (type: LogLine['type'], text: string) => {
    setLogs(prev => [...prev.slice(-30), { type, text }]);
  };

  const handleCommand = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    addLog('cmd', `> ${cmd}`);
    if (cmd.startsWith('/')) {
      const [name, ...args] = cmd.slice(1).split(' ');
      switch (name.toLowerCase()) {
        case 'q': case 'quit': case 'exit': exit(); break;
        case 'help': addLog('info', 'COMMANDS: /clear, /refresh, /quit'); break;
        case 'clear': setLogs([]); break;
        default: addLog('warn', `Unknown command: /${name}`);
      }
    } else {
      setIsThinking(true);
      await handleChat(cmd);
      setIsThinking(false);
    }
  };

  const handleChat = async (text: string) => {
    try {
      const provider = await getProviderInstance(await storage.get<string>('preferred_provider') || 'groq');
      const systemPrompt = `You are GoatBrain OS. You live in a terminal. Keep answers extremely short, 1-2 sentences. Goal context: ${state.goal}`;
      const response = await invokeModel(provider, `${systemPrompt}\n\nUser: ${text}`);
      addLog('ai', response);
    } catch (e: any) {
      addLog('warn', `NETWORK ERROR: ${e.message}`);
    }
  };

  const closedPct = Math.round((state.gap.current / state.gap.target) * 100);
  const isCompact = size.rows < 25;
  
  // Layout Hard-Math to prevent jumping
  const HEADER_H = 3;
  const FOOTER_H = 3;
  const TOP_NAV_H = 3;
  const SAFETY_BUFFER = 4; // Strict 4 lines to prevent terminal scroll trigger
  
  const midHeight = Math.max(5, size.rows - TOP_NAV_H - FOOTER_H - SAFETY_BUFFER);
  const centerWidth = Math.max(30, size.columns - 64 - 2); // 32+32 sidebars
  
  // Explicitly calculate how many logs can fit to avoid relying on overflow=hidden
  const INPUT_H = 3;
  const maxLogsVisible = Math.max(1, midHeight - INPUT_H - (isThinking ? 1 : 0) - 2); 
  const visibleLogs = logs.slice(-maxLogsVisible);

  if (size.rows < 15 || size.columns < 80) {
    return (
      <Box padding={1} borderStyle="round" borderColor={RED}>
        <Text color={RED} bold>WINDOW TOO SMALL. PLEASE RESIZE. ({size.columns}x{size.rows})</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={size.rows - SAFETY_BUFFER} overflow="hidden">
      
      <TopNav goal={state.goal} gap={state.gap.target - state.gap.current} closedPct={closedPct} rank={state.score.rank} />

      <Box height={midHeight} overflow="hidden">
        <LeftPanel current={state.gap.current} target={state.gap.target} unit={state.gap.unit} compact={isCompact} height={midHeight} />
        
        <Box flexDirection="column" flexGrow={1} height={midHeight} borderStyle="round" borderColor={BORDER} paddingX={1} overflow="hidden">
          
          <Box flexGrow={1} flexDirection="column" overflowY="hidden">
            {visibleLogs.map((log, i) => (
              <Box key={i} paddingLeft={log.type === 'ai' ? 0 : 2} height={1} overflow="hidden">
                <Text color={log.type === 'cmd' ? AMBER : log.type === 'ai' ? TEAL : log.type === 'warn' ? RED : MUTED}>
                  {log.type === 'cmd' ? '' : log.type === 'ai' ? '◆  ' : ''}
                </Text>
                <Text color={log.type === 'cmd' ? 'white' : 'white'} dimColor={log.type === 'system'} bold={log.type === 'cmd'} wrap="truncate-end">
                  {log.text.slice(0, centerWidth - 8)}
                </Text>
              </Box>
            ))}
            {isThinking && (
               <Box paddingLeft={2} height={1}><Text color={TEAL} italic>goatbrain is thinking...</Text></Box>
            )}
          </Box>
          
          <CommandInput onSubmit={handleCommand} onExit={exit} width={centerWidth - 10} />
          
        </Box>

        <RightPanel score={state.score.total} xp={state.score.total} compact={isCompact} height={midHeight} />
      </Box>

      <Box borderStyle="round" borderColor={BORDER} paddingX={1} justifyContent="space-between" height={FOOTER_H} flexShrink={0}>
        <Box>
            <Text color={MUTED}>GOAT_OS v3.0 [PREMIUM]</Text>
        </Box>
        <Box>
            <Text color={MUTED}>[T: {size.columns}x{size.rows} | M: {process.memoryUsage().rss / 1024 / 1024 | 0}MB]</Text>
        </Box>
      </Box>

    </Box>
  );
};

export async function startInteractive() {
  // Enter alternate screen buffer & hide cursor
  process.stdout.write('\u001b[?1049h'); 
  process.stdout.write('\u001b[?25l');   
  
  const { waitUntilExit } = render(<HUD />);
  
  try {
    await waitUntilExit();
  } finally {
    // Restore primary screen & show cursor
    process.stdout.write('\u001b[?1049l'); 
    process.stdout.write('\u001b[?25h');   
    process.exit(0);
  }
}
