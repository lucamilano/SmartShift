'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, UserPlus, FileEdit, CalendarDays, Info, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { updateProfile, deleteUserAction } from './actions'

type Member = {
  id: string
  nome: string
  cognome: string
  ruolo: string
}

type Event = {
  utente_id: string
  tipo: string
}

export default function TeamClient({ initialMembers, todaysEvents, stats }: { initialMembers: Member[], todaysEvents: Event[], stats: any }) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  
  // Stati Modale Modifica User
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Member | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCognome, setEditCognome] = useState('')
  const [editRuolo, setEditRuolo] = useState('')
  const [loading, setLoading] = useState(false)

  // Stati Modale Nuovo Collega
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false)

  // Stati Modale Errore custom
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  // Stati Modale Conferma Cancellazione
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Member | null>(null)

  const handleEditClick = (member: Member) => {
    setSelectedUser(member)
    setEditNome(member.nome || '')
    setEditCognome(member.cognome || '')
    setEditRuolo(member.ruolo || 'user')
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (member: Member) => {
    setUserToDelete(member)
    setDeleteConfirmOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    setLoading(true)
    const res = await updateProfile(selectedUser.id, editNome, editCognome, editRuolo)
    setLoading(false)
    
    if (res.error) {
      setAlertMessage(res.error)
      setAlertOpen(true)
    } else {
      // Aggiorniamo la UI in locale
      setMembers(members.map(m => m.id === selectedUser.id ? { ...m, nome: editNome, cognome: editCognome, ruolo: editRuolo } : m))
      setIsEditModalOpen(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setLoading(true)
    const res = await deleteUserAction(userToDelete.id)
    setLoading(false)

    if (res.error) {
      setDeleteConfirmOpen(false)
      setAlertMessage(res.error)
      setAlertOpen(true)
    } else {
      setMembers(members.filter(m => m.id !== userToDelete.id))
      setDeleteConfirmOpen(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Intestazione */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 gap-4 transition-colors">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center">
            <Users className="mr-3 text-blue-600 dark:text-blue-500 h-8 w-8" />
            Gestione Team
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 text-lg">
            Monitora le presenze di oggi, gestisci l'anagrafica e inserisci turni per conto degli altri.
          </p>
        </div>
        <Button onClick={() => setIsNewUserModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white">
          <UserPlus className="h-4 w-4 mr-2" /> Nuovo Collega
        </Button>
      </div>

      {/* Panoramica di Oggi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="border-l-4 border-l-green-500 dark:bg-[#111827] dark:border-y-slate-800 dark:border-r-slate-800 rounded-xl shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.ufficio}</span>
            <span className="text-xs uppercase font-medium text-gray-500 dark:text-slate-400 mt-1">In Ufficio</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 dark:bg-[#111827] dark:border-y-slate-800 dark:border-r-slate-800 rounded-xl shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.smartworking}</span>
            <span className="text-xs uppercase font-medium text-gray-500 dark:text-slate-400 mt-1">Smartworking</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-400 dark:bg-[#111827] dark:border-y-slate-800 dark:border-r-slate-800 rounded-xl shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.ferie}</span>
            <span className="text-xs uppercase font-medium text-gray-500 dark:text-slate-400 mt-1">In Ferie</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 dark:bg-[#111827] dark:border-y-slate-800 dark:border-r-slate-800 rounded-xl shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.malattia}</span>
            <span className="text-xs uppercase font-medium text-gray-500 dark:text-slate-400 mt-1">In Malattia</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-300 dark:border-l-slate-600 rounded-xl shadow-sm bg-gray-50 dark:bg-[#111827] dark:border-y-slate-800 dark:border-r-slate-800">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-gray-600 dark:text-slate-300">{stats.assenti_non_giustificati}</span>
            <span className="text-xs uppercase font-medium text-gray-400 dark:text-slate-500 mt-1">Nessun Turno</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabella Colleghi */}
      <Card className="shadow-sm border-gray-200 dark:border-slate-800 dark:bg-[#111827]">
        <CardHeader className="bg-gray-50/50 dark:bg-[#111827] border-b dark:border-slate-800">
          <CardTitle className="text-xl dark:text-white">Anagrafica Dipendenti <span className="ml-2 text-sm font-normal text-gray-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{members.length}</span></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Visualizzazione Mobile (Lista a schede compatte) */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100 dark:divide-slate-800">
            {members.map((member) => {
              const todayStatus = todaysEvents.find(e => e.utente_id === member.id)
              let statusBadge = <Badge variant="outline" className="text-gray-400 dark:text-slate-400 border-gray-200 dark:border-slate-700">Nessun Evento</Badge>
              
              if (todayStatus) {
                switch(todayStatus.tipo) {
                  case 'ufficio': statusBadge = <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-0">🏢 Ufficio</Badge>; break;
                  case 'smartworking': statusBadge = <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-0">🏠 Smartworking</Badge>; break;
                  case 'ferie': statusBadge = <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-0">🌴 Ferie</Badge>; break;
                  case 'malattia': statusBadge = <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-0">🤒 Malattia</Badge>; break;
                }
              }

              return (
                <div key={member.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-semibold text-sm">
                          {(member.nome?.[0] || 'U') + (member.cognome?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{member.nome} {member.cognome}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {member.ruolo === 'admin' 
                            ? <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Admin</span>
                            : <span className="uppercase tracking-wider">Utente</span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Stato Oggi:</span>
                    <div>{statusBadge}</div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-1 border-t border-gray-50 dark:border-slate-800/50 pt-3">
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-700 dark:hover:bg-slate-800 flex-1">
                      <Link href={`/dashboard/calendario?userId=${member.id}`}>
                        <CalendarDays className="h-3.5 w-3.5 mr-1" /> Calendario
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditClick(member)}
                      className="h-8 w-8 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 shrink-0" 
                    >
                      <FileEdit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteClick(member)}
                      className="h-8 w-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 shrink-0" 
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Visualizzazione Desktop (Tabella Classica) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
            <TableHeader className="bg-gray-50 dark:bg-[#111827]">
              <TableRow className="dark:border-slate-800">
                <TableHead className="w-[200px] pl-6 dark:text-slate-400">Collega</TableHead>
                <TableHead className="dark:text-slate-400">Ruolo</TableHead>
                <TableHead className="dark:text-slate-400">Stato Oggi</TableHead>
                <TableHead className="text-right pr-6 dark:text-slate-400">Azioni Rapide</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const todayStatus = todaysEvents.find(e => e.utente_id === member.id)
                let statusBadge = <Badge variant="outline" className="text-gray-400 dark:text-slate-400 border-gray-200 dark:border-slate-700">Nessun Evento</Badge>
                
                if (todayStatus) {
                  switch(todayStatus.tipo) {
                    case 'ufficio': statusBadge = <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 border-0">🏢 Ufficio</Badge>; break;
                    case 'smartworking': statusBadge = <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-0">🏠 Smartworking</Badge>; break;
                    case 'ferie': statusBadge = <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 border-0">🌴 Ferie</Badge>; break;
                    case 'malattia': statusBadge = <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 border-0">🤒 Malattia</Badge>; break;
                  }
                }

                return (
                  <TableRow key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 dark:border-slate-800">
                    <TableCell className="pl-6 font-medium dark:text-white">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-semibold text-xs">
                            {(member.nome?.[0] || 'U') + (member.cognome?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.nome} {member.cognome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.ruolo === 'admin' 
                        ? <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">Admin</span>
                        : <span className="text-xs uppercase font-semibold text-gray-500 dark:text-slate-400">Utente</span>
                      }
                    </TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild className="h-8 text-xs text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-700 dark:hover:bg-slate-800">
                          <Link href={`/dashboard/calendario?userId=${member.id}`}>
                            <CalendarDays className="h-3.5 w-3.5 mr-1" /> Apri Calendario
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditClick(member)}
                          className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/50 hover:bg-blue-50" 
                          title="Modifica dati anagrafici"
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(member)}
                          className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:bg-red-900/50 hover:bg-red-50" 
                          title="Elimina account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>

      {/* --- Modale di Modifica Dati --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Modifica Anagrafica</DialogTitle>
            <DialogDescription>
              Modifica i dati di questo collega. Per cambiare l'email, contatta il supporto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-semibold">Nome</Label>
                <Input id="nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cognome" className="text-sm font-semibold">Cognome</Label>
                <Input id="cognome" value={editCognome} onChange={(e) => setEditCognome(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Qualifica / Ruolo nel Sistema</Label>
              <Select value={editRuolo} onValueChange={(val: string) => setEditRuolo(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente Base</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSaveEdit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modale "Nuovo Collega" (Info Magic Link) --- */}
      <Dialog open={isNewUserModalOpen} onOpenChange={setIsNewUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
              Aggiungi nuovo dipendente
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-4 text-gray-600">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-start">
              <Info className="h-5 w-5 mr-3 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">
                Grazie al sistema "Magic Link", il tuo gestionale non richiede la creazione manuale di credenziali.
              </p>
            </div>
            
            <p className="text-sm leading-relaxed">
              Per aggiungere un nuovo collega segui questi step:
            </p>
            <ol className="list-decimal pl-5 text-sm space-y-2 font-medium text-gray-700">
              <li>Invia il link al collega in questo momento (es. <strong>http://tuosito.com/login</strong>).</li>
              <li>Scrivigli di inserire la sua email lavorativa.</li>
              <li>Appena farà il suo primo accesso, <strong>il sistema creerà magicamente l'account</strong>.</li>
              <li>Il collega apparirà in questa tabella, e tu potrai usare il tasto Modifica ✍️ per inserire il suo Nome e Cognome definitivi.</li>
            </ol>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsNewUserModalOpen(false)} className="w-full">
              Ho capito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modale Errore Custom --- */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attenzione</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700">Ho Capito</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Modale Conferma Cancellazione --- */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare definitivamente l'account di <strong>{userToDelete?.nome} {userToDelete?.cognome}</strong>. 
              Questa azione cancellerà anche tutti i suoi eventi a calendario (ferie, smartworking, etc) e non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? 'Eliminazione in corso...' : 'Sì, Elimina Utente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
