import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Item, ItemGroup } from '../types';
import { Plus, Package, Tags, Edit, Trash2, MoreVertical, X, Save, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'groups' | 'items'>('groups');
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'group' | 'item'>('group');
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | ItemGroup | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({
    name: '',
    group_id: '',
    price: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside both the dropdown button and the dropdown itself
      if (dropdownOpen !== null && 
          !target.closest('.dropdown-container') && 
          !target.closest('[style*="position: fixed"]') &&
          !target.closest('[style*="z-index: 9999"]')) {
        setDropdownOpen(null);
        setDropdownPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const fetchData = async () => {
    try {
      const [groupsData, itemsData] = await Promise.all([
        api.getItemGroups(),
        api.getItems(),
      ]);
      setItemGroups(groupsData);
      setItems(itemsData);
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setGroupForm({ name: '', description: '' });
    setItemForm({ name: '', group_id: '', price: '', description: '' });
    setEditMode(false);
    setSelectedItem(null);
  };

  const openModal = (type: 'group' | 'item', item?: Item | ItemGroup) => {
    setModalType(type);
    setEditMode(!!item);
    setSelectedItem(item || null);
    
    if (item) {
      if (type === 'group') {
        const group = item as ItemGroup;
        setGroupForm({ name: group.name, description: group.description || '' });
      } else {
        const itemData = item as Item;
        setItemForm({
          name: itemData.name,
          group_id: itemData.group_id.toString(),
          price: itemData.price ? itemData.price.toString() : '',
          description: itemData.description || '',
        });
      }
    } else {
      resetForms();
    }
    
    setShowModal(true);
    setDropdownOpen(null);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedItem) {
        await api.updateItemGroup(selectedItem.id, groupForm);
        toast.success('Item group updated successfully');
      } else {
        await api.createItemGroup(groupForm);
        toast.success('Item group created successfully');
      }
      resetForms();
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editMode ? 'update' : 'create'} item group`);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        ...itemForm,
        group_id: parseInt(itemForm.group_id),
        price: itemForm.price ? parseFloat(itemForm.price) : null,
      };

      if (editMode && selectedItem) {
        await api.updateItem(selectedItem.id, itemData);
        toast.success('Item updated successfully');
      } else {
        await api.createItem(itemData);
        toast.success('Item created successfully');
      }
      resetForms();
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editMode ? 'update' : 'create'} item`);
    }
  };

  const deleteGroup = async (group: ItemGroup) => {
    if (window.confirm(`Are you sure you want to delete "${group.name}"? This will also delete all items in this group.`)) {
      try {
        await api.deleteItemGroup(group.id);
        toast.success('Item group deleted successfully');
        fetchData();
        setDropdownOpen(null);
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete item group');
      }
    }
  };

  const deleteItem = async (item: Item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await api.deleteItem(item.id);
        toast.success('Item deleted successfully');
        fetchData();
        setDropdownOpen(null);
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete item');
      }
    }
  };

  // Filter items based on search term and group filter
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGroup = filterGroup === 'all' || item.group_id.toString() === filterGroup;
    
    return matchesSearch && matchesGroup;
  });

  // Filter item groups based on search term
  const filteredItemGroups = itemGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(groupSearchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const handleDropdownClick = (id: number, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    
    if (dropdownOpen === id) {
      setDropdownOpen(null);
      setDropdownPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Calculate position for dropdown
      const dropdownWidth = 140;
      const dropdownHeight = 80;
      
      let left = rect.right + scrollLeft - dropdownWidth;
      let top = rect.bottom + scrollTop + 4;
      
      // Adjust if dropdown would go off screen
      if (left < 10) left = 10;
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }
      if (top + dropdownHeight > window.innerHeight + scrollTop - 10) {
        top = rect.top + scrollTop - dropdownHeight - 4;
      }
      
      setDropdownPosition({ top, left });
      setDropdownOpen(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gray-900 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600 text-sm">Manage your product groups and items</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('groups')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'groups'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Tags className="inline h-4 w-4 mr-2" />
                Item Groups ({itemGroups.length})
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'items'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="inline h-4 w-4 mr-2" />
                Items ({items.length})
              </button>
            </nav>
          </div>

          {/* Item Groups Tab */}
          {activeTab === 'groups' && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search groups by name or description..."
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={() => openModal('group')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Group</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItemGroups.map((group) => (
                  <div key={group.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{group.description}</p>
                      </div>
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => handleDropdownClick(group.id, e)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{items.filter(item => item.group_id === group.id).length} items</span>
                      <span>{new Date(group.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredItemGroups.length === 0 && (
                <div className="text-center py-12">
                  <Tags className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {itemGroups.length === 0 ? 'No item groups found' : 'No groups match your search'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {itemGroups.length === 0 
                      ? 'Get started by creating your first item group' 
                      : 'Try adjusting your search criteria'
                    }
                  </p>
                  {itemGroups.length === 0 && (
                    <button
                      onClick={() => openModal('group')}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                    >
                      Add Your First Group
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search items by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={filterGroup}
                      onChange={(e) => setFilterGroup(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      <option value="all">All Groups</option>
                      {itemGroups.map((group) => (
                        <option key={group.id} value={group.id.toString()}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={() => openModal('item')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>

              {filteredItems.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Group
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500">{item.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.group_name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {item.price ? `₹${item.price.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(item.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="relative dropdown-container">
                                <button
                                  onClick={(e) => handleDropdownClick(item.id, e)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {items.length === 0 ? 'No items found' : 'No items match your search'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {items.length === 0 
                      ? 'Get started by adding your first item' 
                      : 'Try adjusting your search criteria or filters'
                    }
                  </p>
                  {items.length === 0 && (
                    <button
                      onClick={() => openModal('item')}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                    >
                      Add Your First Item
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editMode ? 'Edit' : 'Add'} {modalType === 'group' ? 'Item Group' : 'Item'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForms();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                {modalType === 'group' ? (
                  <form onSubmit={handleGroupSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        value={groupForm.name}
                        onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                        placeholder="Enter group name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        rows={3}
                        value={groupForm.description}
                        onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                        placeholder="Enter group description"
                      />
                    </div>
                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          resetForms();
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>{editMode ? 'Update' : 'Create'} Group</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleItemSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        placeholder="Enter item name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Group *</label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        value={itemForm.group_id}
                        onChange={(e) => setItemForm({ ...itemForm, group_id: e.target.value })}
                      >
                        <option value="">Select a group</option>
                        {itemGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        value={itemForm.price}
                        onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                        placeholder="Enter price"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        rows={3}
                        value={itemForm.description}
                        onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                        placeholder="Enter item description"
                      />
                    </div>
                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          resetForms();
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>{editMode ? 'Update' : 'Create'} Item</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Position Dropdown Portal */}
      {dropdownOpen !== null && dropdownPosition && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999
          }}
        >
          {/* Group Actions - only show if we're on groups tab */}
          {activeTab === 'groups' && (
            <>
              <button
                onClick={() => {
                  const group = itemGroups.find(g => g.id === dropdownOpen);
                  if (group) {
                    openModal('group', group);
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Group</span>
              </button>
              <button
                onClick={() => {
                  const group = itemGroups.find(g => g.id === dropdownOpen);
                  if (group) {
                    deleteGroup(group);
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Group</span>
              </button>
            </>
          )}
          
          {/* Item Actions - only show if we're on items tab */}
          {activeTab === 'items' && (
            <>
              <button
                onClick={() => {
                  const item = items.find(i => i.id === dropdownOpen);
                  if (item) {
                    openModal('item', item);
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Item</span>
              </button>
              <button
                onClick={() => {
                  const item = items.find(i => i.id === dropdownOpen);
                  if (item) {
                    deleteItem(item);
                    setDropdownOpen(null);
                    setDropdownPosition(null);
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Item</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Inventory; 