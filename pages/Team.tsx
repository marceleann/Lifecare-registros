import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { Button } from '../components/Button';
import { Plus, User, Trash2, Mail, Shield, ClipboardList, X, Info } from 'lucide-react';
import { ChecklistItem } from '../types';
import { BASE_CHECKLIST } from '../constants';

export const Team = () => {
  const { users, addUser, updateClientChecklist } = useLifecare();
  const [activeTab, setActiveTab] = useState<'caregiver' | 'client'>('caregiver');
  const [showModal, setShowModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  
  // New User State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'caregiver' as 'caregiver' | 'client'
  });

  // Checklist Editing State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem[]>([]);
  const [newActivity, setNewActivity] = useState({ label: '', time: '' });

  const filteredUsers = users.filter(u => u.role === activeTab);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    });
    setShowModal(false);
    setNewUser({ name: '', email: '', role: 'caregiver' });
  };

  const handleOpenChecklist = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Use existing custom checklist or copy base
    const checklist = user.customChecklist 
        ? [...user.customChecklist]
        : JSON.parse(JSON.stringify(BASE_CHECKLIST));
    
    setEditingUserId(userId);
    setEditingChecklist(checklist);
    setShowChecklistModal(true);
  };

  const handleSaveChecklist = () => {
    if (editingUserId) {
        updateClientChecklist(editingUserId, editingChecklist);
        setShowChecklistModal(false);
        setEditingUserId(null);
    }
  };

  const handleAddActivity = () => {
    if (!newActivity.label) return;
    const newItem: ChecklistItem = {
        id: Math.random().toString(36).substr(2, 9),
        label: newActivity.label,
        category: 'activity', // Default
        completed: false,
        required: true,
        time: newActivity.time || undefined
    };
    setEditingChecklist([...editingChecklist, newItem]);
    setNewActivity({ label: '', time: '' });
  };

  const handleRemoveActivity = (itemId: string) => {
    setEditingChecklist(editingChecklist.filter(i => i.id !== itemId));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#141C4D]">Gestão de Equipe e Clientes</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={20} className="mr-2" /> Novo Cadastro
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('caregiver')}
          className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'caregiver' ? 'border-b-2 border-[#13808E] text-[#13808E]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Cuidadores
        </button>
        <button
          onClick={() => setActiveTab('client')}
          className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'client' ? 'border-b-2 border-[#13808E] text-[#13808E]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Clientes
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-3xl">
            Nenhum registro encontrado.
          </div>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-[#13808E] transition-all relative">
              <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full border-2 border-gray-100" />
              <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-[#141C4D] truncate">{user.name}</h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Mail size={14} className="mr-1" />
                  <span className="truncate">{user.email}</span>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center text-xs text-[#13808E] font-medium bg-[#E0F2F1] px-2 py-1 rounded w-fit capitalize">
                        <Shield size={12} className="mr-1" />
                        {user.role}
                    </div>
                    
                    {user.role === 'client' && (
                        <button 
                            onClick={() => handleOpenChecklist(user.id)}
                            className="text-xs flex items-center text-gray-600 hover:text-[#13808E] bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                        >
                            <ClipboardList size={12} className="mr-1" /> Plano de Cuidado
                        </button>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8">
            <h2 className="text-2xl font-bold text-[#141C4D] mb-6">Novo Cadastro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário</label>
                <select
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-[#13808E] outline-none"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                >
                  <option value="caregiver">Cuidador(a)</option>
                  <option value="client">Cliente</option>
                </select>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                  <Info size={18} className="text-blue-600 mt-0.5" />
                  <p className="text-xs text-blue-800">
                      A senha inicial padrão para novos usuários será <strong>12345678</strong>. O usuário poderá alterá-la no primeiro acesso (via Esqueci Minha Senha).
                  </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#141C4D]">Personalizar Plano de Cuidado</h2>
                <button onClick={() => setShowChecklistModal(false)} className="text-gray-400"><X /></button>
            </div>
            
            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Adicionar Atividade</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Nome da atividade (ex: Fisioterapia)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
                        value={newActivity.label}
                        onChange={e => setNewActivity({...newActivity, label: e.target.value})}
                    />
                    <input 
                        type="time" 
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
                        value={newActivity.time}
                        onChange={e => setNewActivity({...newActivity, time: e.target.value})}
                    />
                    <Button onClick={handleAddActivity} className="py-2 px-3 text-sm h-auto">+</Button>
                </div>
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Checklist Atual</h3>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
                {editingChecklist.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                            {item.time && <span className="text-xs text-[#13808E] bg-white px-1 rounded">{item.time}</span>}
                        </div>
                        <button onClick={() => handleRemoveActivity(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setShowChecklistModal(false)}>Cancelar</Button>
                <Button onClick={handleSaveChecklist}>Salvar Alterações</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};