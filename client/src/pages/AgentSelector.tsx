import { useState } from "react";
import { useNavigate } from "wouter";
import { AGENTS } from "@shared/agents";

export default function AgentSelector() {
  const [selectedAgent, setSelectedAgent] = useState("");
  const navigate = useNavigate();

  const handleAgentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const initials = e.target.value;
    if (initials) {
      navigate(`/${initials}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #192F56 0%, #19112D 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '3rem 2rem',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 700,
          color: '#192F56',
          marginBottom: '1rem',
          textAlign: 'center',
        }}>
          Select Your Account
        </h1>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          Choose your name to access your application portal
        </p>

        <select
          value={selectedAgent}
          onChange={handleAgentSelect}
          data-testid="select-agent"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23192F56' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2.5rem',
          }}
        >
          <option value="">-- Select an agent --</option>
          {AGENTS.map((agent) => (
            <option key={agent.initials} value={agent.initials}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
