import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2 } from 'lucide-react';
import type { User, CreateUserInput, UpdateUserInput, UserRole } from '../../../server/src/schema';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    name: '',
    role: 'staff'
  });

  // Update form state
  const [updateFormData, setUpdateFormData] = useState<UpdateUserInput>({
    id: 0,
    email: '',
    name: '',
    role: 'staff',
    is_active: true
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await trpc.getUsers.query();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const newUser = await trpc.createUser.mutate(formData);
      setUsers((prev: User[]) => [...prev, newUser]);
      setFormData({ email: '', name: '', role: 'staff' });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSubmitting(true);
      const updatedUser = await trpc.updateUser.mutate(updateFormData);
      setUsers((prev: User[]) => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setEditingUser(null);
      setUpdateFormData({ id: 0, email: '', name: '', role: 'staff', is_active: true });
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setUpdateFormData({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active
    });
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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return '👑';
      case 'manager':
        return '👨‍💼';
      case 'staff':
        return '👤';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>👥 User Management</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>👥 User Management</CardTitle>
            <CardDescription>
              Manage users and their roles in the procurement system
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the procurement system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value: UserRole) => 
                      setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">👤 Staff</SelectItem>
                        <SelectItem value="manager">👨‍💼 Manager</SelectItem>
                        <SelectItem value="super_admin">👑 Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">👥</span>
            <p className="text-gray-500">No users found. Create your first user above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user: User) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{user.name}</h3>
                      {!user.is_active && (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Created {user.created_at.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getRoleColor(user.role)}>
                    {user.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditUser(user)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <form onSubmit={handleUpdateUser}>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information and role
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="update-name">Full Name</Label>
                  <Input
                    id="update-name"
                    value={updateFormData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData((prev: UpdateUserInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-email">Email Address</Label>
                  <Input
                    id="update-email"
                    type="email"
                    value={updateFormData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-role">Role</Label>
                  <Select 
                    value={updateFormData.role || 'staff'} 
                    onValueChange={(value: UserRole) => 
                      setUpdateFormData((prev: UpdateUserInput) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">👤 Staff</SelectItem>
                      <SelectItem value="manager">👨‍💼 Manager</SelectItem>
                      <SelectItem value="super_admin">👑 Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="update-active"
                    checked={updateFormData.is_active || false}
                    onCheckedChange={(checked: boolean) =>
                      setUpdateFormData((prev: UpdateUserInput) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="update-active">User is active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}