import { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import Flow from './Flow';
import { FiSun, FiMoon, FiMail } from 'react-icons/fi';
import { Node, Edge } from 'reactflow';
import { ThemeContext } from './providers/ThemeProvider';
import { darken, lighten } from 'polished';
import { useTranslation } from 'react-i18next';
import { FaEye, FaPlus } from 'react-icons/fa';
import { convertFlowToJson, convertJsonToFlow, isCompatibleConfigVersion, migrateConfig, nodesTopologicalSort } from '../utils/flowUtils';
import { toastCustomIconInfoMessage, toastFastInfoMessage, toastInfoMessage } from '../utils/toastUtils';
import ButtonRunAll from './buttons/ButtonRunAll';
import { SocketContext } from './providers/SocketProvider';
import LoginButton from './login/LoginButton';
import FlowWrapper from './FlowWrapper';
import { UserContext } from './providers/UserProvider';
import SmartView from './smart-view/SmartView';
import { Layout } from './smart-view/RenderLayout';
import Tab from './Tab';


export interface FlowTab {
  nodes: Node[];
  edges: Edge[];
  layout?: Layout;
  metadata?: FlowMetadata;
}


interface FlowMetadata {
  version: string;
}


interface FlowManagerState {
  tabs: FlowTab[];
}

export type ApplicationMode = 'flow' | 'view'

const FlowTabs = () => {
  const { t } = useTranslation('flow');

  const [flowTabs, setFlowTabs] = useState<FlowManagerState>({ tabs: [{ nodes: [], edges: [] }] });
  const [currentTab, setCurrentTab] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [showOnlyOutput, setShowOnlyOutput] = useState(false);
  const { dark, toggleTheme } = useContext(ThemeContext);
  const { socket, verifyConfiguration, config } = useContext(SocketContext);
  const { user, setLoggedUser } = useContext(UserContext);
  const [isRunning, setIsRunning] = useState(false);
  const [openConfig, setOpenConfig] = useState(false)
  const [mode, setMode] = useState<ApplicationMode>('flow')
  const useAuth = process.env.REACT_APP_USE_AUTH === 'true';

  const handleToggleOutput = () => {
    setShowOnlyOutput(!showOnlyOutput);
  };

  useEffect(() => {
    const savedFlowTabsJson = localStorage.getItem('flowTabs');
    if (savedFlowTabsJson) {
      const savedFlowTabs = JSON.parse(savedFlowTabsJson) as FlowManagerState;
      savedFlowTabs.tabs.forEach((tab) => {
        if (!isCompatibleConfigVersion(tab.metadata?.version)) {
          migrateConfig(tab)
        }
      })
      setFlowTabs(savedFlowTabs);
      setRefresh(true);
    }
  }, []);

  useEffect(() => {
    if (flowTabs.tabs.length >= 1 && flowTabs.tabs[0].nodes.length !== 0) {
      localStorage.setItem('flowTabs', JSON.stringify(flowTabs));
    }
  }, [flowTabs]);

  useEffect(() => {
    const loadIntroFile = async () => {
      const firstVisit = localStorage.getItem('firstVisit') !== 'false';
      const savedFlowTabs = localStorage.getItem('flowTabs');

      if (firstVisit && !savedFlowTabs) {
        try {
          const response = await fetch('/samples/intro.json');
          if (!response.ok) {
            throw new Error('Failed to fetch intro file');
          }
          const jsonData = await response.json();
          const newFlowTab: FlowManagerState = { tabs: [] }
          newFlowTab.tabs.push(convertJsonToFlow(jsonData))

          setFlowTabs(newFlowTab);
          setRefresh(true);

          localStorage.setItem('firstVisit', 'false');
        } catch (error) {
          console.error("Cannot load sample file :", error);
        }
      }
    };

    loadIntroFile();
  }, []);

  const addFlowTab = () => {
    const newFlowTab = { ...flowTabs }
    newFlowTab.tabs.push({ nodes: [], edges: [], metadata: { version: '1.0.0' } })
    setFlowTabs(newFlowTab);
  };

  const handleFlowChange = (nodes: Node[], edges: Edge[]) => {
    const updatedTabs = flowTabs.tabs.map((tab, index) => {
      if (index === currentTab) {
        return { ...tab, nodes, edges };
      }
      return tab;
    });
    const updatedFlowTabs = { ...flowTabs, tabs: updatedTabs };
    setFlowTabs(updatedFlowTabs);
  };

  const handleLayoutChange = (layout: Layout) => {
    const updatedTabs = flowTabs.tabs.map((tab, index) => {
      if (index === currentTab) {
        return { ...tab, layout };
      }
      return tab;
    });
    const updatedFlowTabs = { ...flowTabs, tabs: updatedTabs };
    setFlowTabs(updatedFlowTabs);
  }

  const handleRunAllCurrentFlow = () => {
    if (!verifyConfiguration()) {
      toastInfoMessage(t('ApiKeyRequiredMessage'));
      return;
    }

    const nodes = flowTabs.tabs[currentTab].nodes;
    const edges = flowTabs.tabs[currentTab].edges;

    const nodesSorted = nodesTopologicalSort(nodes, edges);
    const flowFile = convertFlowToJson(nodesSorted, edges, true);
    socket?.emit('process_file',
      {
        jsonFile: JSON.stringify(flowFile),
        openaiApiKey: config?.openaiApiKey,
        stabilityaiApiKey: config?.stabilityaiApiKey,
      });
    setIsRunning(true);
  }

  const handleChangeRun = (runStatus: boolean) => {
    setIsRunning(runStatus);
  }

  const handleChangeTab = (index: number) => {
    if (!isRunning) {
      setCurrentTab(index);
    } else {
      toastFastInfoMessage(t('CannotChangeTabWhileRunning'));
    }
  }

  const handleClickFeedback = () => {
    toastCustomIconInfoMessage('You can send me a DM on X/Twitter, or open an Issue on Github :) My links are at the bottom of the configuration menu', FiMail)
  }

  const handleClickProfile = () => {
    setOpenConfig(true);
  }

  const handleChangeMode = (mode: ApplicationMode) => {
    setMode(mode);
  }

  const handleDeleteFlow = (index: number) => {
    if (flowTabs.tabs.length === 1) {
      toastInfoMessage(t('CannotDeleteLastFlow'));
      return;
    }
    const updatedTabs = flowTabs.tabs.filter((_, i) => i !== index);
    const updatedFlowTabs = { ...flowTabs, tabs: updatedTabs };
    setFlowTabs(updatedFlowTabs);
    setCurrentTab(index - 1 > 0 ? index - 1 : 0);
  }

  return (
    <FlowManagerContainer className='bg-app-dark-gradient'>
      <TabsContainer className='flex flex-row items-center justify-center h-16 py-2  border-b-sky-950/50 z-30'>
        <div className='ml-4 mx-auto flex flex-row text-center align-middle justify-center'>
          <img src="logo.png" className='w-16' alt="Logo"></img>
          <h1 className='flex text-slate-200 items-center justify-center px-2 text-xl font-medium sm:invisible md:visible'> AI-Flow </h1>
        </div>
        <Tabs>
          {flowTabs.tabs.map((tab, index) => (
            <Tab
              key={index}
              index={index}
              active={index === currentTab}
              onChangeTab={handleChangeTab}
              onDeleteFlow={handleDeleteFlow}>
              {t('Flow')} {index + 1}
            </Tab>
          ))}
        </Tabs>
        <AddTabButton onClick={addFlowTab} className='text-lg text-slate-200 hover:text-slate-50 hover:ring-2 ring-slate-200 rounded-lg py-1 px-1'>
          <FaPlus />
        </AddTabButton>
        <RightControls>
          <div className='px-2 py-2'>
            <FaEye className='text-slate-400 hover:text-slate-50'
              onClick={handleToggleOutput} />
          </div>

          {
            useAuth
            && <>
              <div className='border-l-2 border-l-slate-500/50 h-6'></div>
              <LoginButton user={user} onClickProfile={handleClickProfile} />
            </>
          }

          <div className='border-l-2 border-l-slate-500/50 h-6 pl-3'></div>
          <div className='pr-2'>
            <ButtonRunAll onClick={handleRunAllCurrentFlow} isRunning={isRunning} />
          </div>
          {/* <ToggleThemeButton onClick={toggleTheme}>
            {dark ? <FiMoon /> : <FiSun />}
          </ToggleThemeButton> */}
        </RightControls>
      </TabsContainer>
      {/* {
        mode === 'flow' &&
        <FeedbackIcon className="absolute right-10 top-0 h-24 w-28 
                              px-6 
                              bg-sky-950 text-slate-100 
                              z-10 rounded-b-md sm:invisible md:visible cursor-pointer
                              flex items-center justify-center
                              hover:text-slate-50 hover:bg-sky-900" onClick={handleClickFeedback}>
          <div className='absolute bottom-0 pb-1' > Feedback ? </div>
        </FeedbackIcon>
      } */}
      <FlowWrapper mode={mode} openConfig={openConfig} onCloseConfig={() => setOpenConfig(false)} onOpenConfig={() => setOpenConfig(true)} onChangeMode={handleChangeMode}>
        {
          mode === 'flow' &&
          <Flow
            key={`flow-${currentTab}-${refresh}`}
            nodes={flowTabs.tabs[currentTab].nodes}
            edges={flowTabs.tabs[currentTab].edges}
            onFlowChange={handleFlowChange}
            showOnlyOutput={showOnlyOutput}
            isRunning={isRunning}
            onRunChange={handleChangeRun}
          />
        }
        {
          mode === 'view' &&
          <SmartView
            key={`smartview-${currentTab}-${refresh}`}
            nodes={flowTabs.tabs[currentTab].nodes}
            edges={flowTabs.tabs[currentTab].edges}
            tabLayout={flowTabs.tabs[currentTab].layout}
            isRunning={isRunning}
            onLayoutChange={handleLayoutChange}
            onFlowChange={handleFlowChange}
            onRunChange={handleChangeRun}
          />
        }

      </FlowWrapper>
    </FlowManagerContainer>
  );
};

const FeedbackIcon = styled.div`
`;

const FlowManagerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const buttonPaddingValue = "8px 12px";

const TabsContainer = styled.div`
  font-family: Roboto;
`;

const Tabs = styled.div`
  white-space: nowrap;
  overflow-y: hidden;
  overflow-x: auto;
  padding-bottom: 3px;
  max-width: 60%;
`;



const AddTabButton = styled.div`
`;

const RightControls = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
`;

const ToggleThemeButton = styled.button`
  border: none;
  background-color: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.accentText};
  margin-right: 10px;

  :hover {
    color:${({ theme }) => theme.text};
  }
`;

export default FlowTabs;