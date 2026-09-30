import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { usePopovers } from '../../../hooks/usePopovers';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import {
  Employee, Department, EmploymentType, EmployeeStatus,
  getAllEmployees, createEmployee, updateEmployee, deleteEmployee,
  getDepartments, getEmploymentTypes, getEmployeeStatuses,
} from '../../../api/employeesApi';
import {
  EmployeeDraft, EmployeeStatusFilter, EMPTY_DRAFT, SP_MESSAGES_ES,
  STATUS_ACTIVE, STATUS_INACTIVE,
} from './EmployeesTypes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errorText = (err: unknown, fallback: string) => {
  const msg = err instanceof Error ? err.message : '';
  return SP_MESSAGES_ES[msg] ?? (msg || fallback);
};

export const useEmployees = () => {
  const { companyId } = useUser();
  const pops = usePopovers();
  const { showToast, toastProps } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [statuses, setStatuses] = useState<EmployeeStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>('active');

  const [draft, setDraft] = useState<EmployeeDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [list, deps, types, sts] = await Promise.all([
        getAllEmployees(companyId),
        getDepartments(),
        getEmploymentTypes(),
        getEmployeeStatuses(),
      ]);
      setEmployees(list);
      setDepartments(deps);
      setEmploymentTypes(types);
      setStatuses(sts);
    } catch (err) {
      console.error('[Employees] load failed:', err);
      showToast('No se pudieron cargar los empleados', 'danger');
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => { load(); }, [load]);
  useIonViewWillEnter(() => { load(); });
  useEffect(() => onDataChanged(reason => {
    console.log('[Employees] data-changed →', reason);
    load();
  }), [load]);

  const counts = useMemo(() => ({
    all: employees.length,
    active: employees.filter(e => e.statusId === STATUS_ACTIVE).length,
    inactive: employees.filter(e => e.statusId !== STATUS_ACTIVE).length,
  }), [employees]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return employees.filter(e => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? e.statusId === STATUS_ACTIVE : e.statusId !== STATUS_ACTIVE);
      const matchesSearch = !q || [
        `${e.firstName} ${e.lastName}`, e.email, e.phoneNumber, e.position, e.departmentName,
      ].some(v => v?.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [employees, searchText, statusFilter]);

  // ── Form ───────────────────────────────────────────────────────────────────
  const openCreate = () => setDraft({
    ...EMPTY_DRAFT,
    employmentTypeId: employmentTypes[0]?.employmentTypeId ?? 0,
    departmentId: departments[0]?.departmentId ?? 0,
  });

  const openEdit = (e: Employee) => setDraft({
    employeeId: e.employeeId,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    phoneNumber: e.phoneNumber,
    address: e.address,
    employmentTypeId: e.employmentTypeId,
    position: e.position,
    departmentId: e.departmentId,
    statusId: e.statusId,
    hireDate: e.hireDate,
    endDate: e.endDate,
    emergencyContactName: e.emergencyContactName,
    emergencyContactRelationship: e.emergencyContactRelationship,
    emergencyContactPhone: e.emergencyContactPhone,
    notes: e.notes,
  });

  const closeForm = () => { if (!saving) setDraft(null); };

  const setField = <K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) =>
    setDraft(d => (d ? { ...d, [key]: value } : d));

  const formError = useMemo(() => {
    if (!draft) return '';
    if (!draft.firstName.trim() || !draft.lastName.trim()) return 'Nombre y apellido son obligatorios.';
    if (!EMAIL_RE.test(draft.email.trim())) return 'Correo electrónico inválido.';
    if (!draft.departmentId || !draft.employmentTypeId) return 'Selecciona departamento y tipo de contrato.';
    if (draft.endDate && draft.hireDate && draft.endDate < draft.hireDate)
      return 'La fecha de baja no puede ser anterior a la de ingreso.';
    return '';
  }, [draft]);

  const save = async () => {
    if (!draft || !companyId || formError) return;
    const { employeeId, ...data } = draft;
    const payload = {
      ...data,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
    };
    setSaving(true);
    try {
      if (employeeId) await updateEmployee(companyId, employeeId, payload);
      else await createEmployee(companyId, payload);
      showToast(employeeId ? '✓ Empleado actualizado' : '✓ Empleado registrado');
      setDraft(null);
      notifyDataChanged('employee-saved');
    } catch (err) {
      showToast(errorText(err, 'Error al guardar empleado'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete / deactivate ────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!toDelete || !companyId) return;
    const target = toDelete;
    setToDelete(null);
    setDeletingId(target.employeeId);
    try {
      await deleteEmployee(companyId, target.employeeId);
      showToast('✓ Empleado eliminado');
      notifyDataChanged('employee-deleted');
    } catch (err) {
      showToast(errorText(err, 'Error al eliminar empleado'), 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  /** Pre-fills an Inactive status + today's endDate in the form (baja). */
  const deactivateFromForm = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      statusId: STATUS_INACTIVE,
      endDate: draft.endDate || new Date().toLocaleDateString('en-CA'),
    });
  };

  return {
    loading, employees: filtered, counts,
    departments, employmentTypes, statuses,
    searchText, setSearchText, statusFilter, setStatusFilter,
    draft, openCreate, openEdit, closeForm, setField, formError, save, saving,
    deactivateFromForm,
    toDelete, setToDelete, confirmDelete, deletingId,
    pops, toastProps,
  };
};

export type EmployeesVM = ReturnType<typeof useEmployees>;
