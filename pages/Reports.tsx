import React, { useState } from 'react';
import { useLifecare } from '../context/LifecareContext';
import { format } from 'date-fns';
import { FileText, Search, Filter } from 'lucide-react';
import ptBR from 'date-fns/locale/pt-BR';

export const Reports = () => {
  const { reports, currentUser } = useLifecare();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logic based on role
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
        r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.caregiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.generalState.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (currentUser?.role === 'client') {
        // Clients see reports about themselves (simulated by checking name match or generic 'Sr. João Santos')
        return matchesSearch; // In real app, filter by client ID
    } else if (currentUser?.role === 'caregiver') {
        // Caregivers see reports they wrote OR reports for clients they are assigned to
        return matchesSearch;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#141C4D]">Histórico de Relatórios</h1>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
            <Search className="text-gray-400" />
            <input 
                type="text" 
                placeholder="Buscar por nome, data ou conteúdo..." 
                className="flex-1 outline-none text-gray-700 bg-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Filter className="text-gray-400" />
        </div>

        <div className="grid gap-4">
            {filteredReports.map(report => (
                <div key={report.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-[#13808E] transition-all">
                    <div className="flex flex-col md:flex-row justify-between md:items-start mb-4">
                        <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                    {format(new Date(report.date), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <span className="text-sm text-gray-500">{format(new Date(report.date), "HH:mm")}</span>
                             </div>
                             <h3 className="font-bold text-lg text-[#141C4D]">{report.clientName}</h3>
                             <p className="text-sm text-gray-500">Cuidador(a): {report.caregiverName}</p>
                        </div>
                        {report.incidents && report.incidents !== 'Nenhuma intercorrência.' && (
                            <span className="mt-2 md:mt-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Intercorrência Registrada
                            </span>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="font-semibold text-gray-700 mb-1">Estado Geral</p>
                            <p className="text-gray-600">{report.generalState}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="font-semibold text-gray-700 mb-1">Atividades</p>
                            <p className="text-gray-600">{report.activities}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="font-semibold text-gray-700 mb-1">Alimentação</p>
                            <p className="text-gray-600">{report.food}</p>
                        </div>
                         <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="font-semibold text-gray-700 mb-1">Medicamentos</p>
                            <p className="text-gray-600">{report.meds}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};