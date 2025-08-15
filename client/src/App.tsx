import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';
import { ManagerDashboard } from '@/components/ManagerDashboard';
import { StaffDashboard } from '@/components/StaffDashboard';
import { UserManagement } from '@/components/UserManagement';
import { CategoryManagement } from '@/components/CategoryManagement';
import { ItemManagement } from '@/components/ItemManagement';
import { RequestManagement } from '@/components/RequestManagement';
import type { User, UserRole } from '../../server/src/schema';

function App() {
  // Simulate user authentication - in real app this would come from auth context
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
      // Set first user as current user for demo purposes
      if (result.length > 0 && !currentUser) {
        setCurrentUser(result[0]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUserSwitch = (userId: string) => {
    const user = users.find((u: User) => u.id.toString() === userId);
    if (user) {
      setCurrentUser(user);
      setActiveTab('dashboard'); // Reset to dashboard when switching users
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTabsForRole = (role: UserRole) => {
    const baseTabs = [
      { id: 'dashboard', label: '🏠 Dashboard' },
      { id: 'requests', label: '📋 Requests' }
    ];

    switch (role) {
      case 'super_admin':
        return [
          ...baseTabs,
          { id: 'users', label: '👥 User Management' },
          { id: 'categories', label: '🏷️ Categories' },
          { id: 'items', label: '📦 Items' }
        ];
      case 'manager':
        return [
          ...baseTabs,
          { id: 'reports', label: '📊 Reports' }
        ];
      case 'staff':
        return baseTabs;
      default:
        return baseTabs;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">🏢 Procurement System</CardTitle>
            <CardDescription className="text-center">Loading users...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = getTabsForRole(currentUser.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">🏢 Procurement System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <Badge className={getRoleColor(currentUser.role)}>
                  {currentUser.role.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              {users.length > 1 && (
                <Select value={currentUser.id.toString()} onValueChange={handleUserSwitch}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: User) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl mx-auto" style={{gridTemplateColumns: `repeat(${tabs.length}, 1fr)`}}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-8">
            <TabsContent value="dashboard">
              {currentUser.role === 'super_admin' && <SuperAdminDashboard user={currentUser} />}
              {currentUser.role === 'manager' && <ManagerDashboard user={currentUser} />}
              {currentUser.role === 'staff' && <StaffDashboard user={currentUser} />}
            </TabsContent>

            <TabsContent value="requests">
              <RequestManagement user={currentUser} />
            </TabsContent>

            {currentUser.role === 'super_admin' && (
              <>
                <TabsContent value="users">
                  <UserManagement />
                </TabsContent>
                <TabsContent value="categories">
                  <CategoryManagement />
                </TabsContent>
                <TabsContent value="items">
                  <ItemManagement />
                </TabsContent>
              </>
            )}

            {currentUser.role === 'manager' && (
              <TabsContent value="reports">
                <Card>
                  <CardHeader>
                    <CardTitle>📊 Reports & Analytics</CardTitle>
                    <CardDescription>View procurement reports and analytics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">Reports functionality coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </main>
    </div>
  );
}

export default App;