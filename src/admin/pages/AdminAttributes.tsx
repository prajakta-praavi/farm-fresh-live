import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { Attribute, AttributeTerm } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_UNIT_OPTIONS = ["gm", "kg", "litre", "ml", "pcs"];
const WEIGHT_PRESETS = ["250", "500", "750", "1"];
const UNIT_STORAGE_KEY = "rushivan_attribute_unit_options";

const formatTermName = (quantity: string, unit: string, fallback: string) => {
  const q = quantity.trim();
  const u = unit.trim();
  if (q && u) return `${q} ${u}`;
  return fallback.trim();
};

const AdminAttributes = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [terms, setTerms] = useState<AttributeTerm[]>([]);
  const [attributeName, setAttributeName] = useState("");
  const [termName, setTermName] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [unit, setUnit] = useState("gm");
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNIT_OPTIONS);
  const [newUnitName, setNewUnitName] = useState("");
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const quantityInputRef = useRef<HTMLInputElement | null>(null);

  const loadAttributes = async () => {
    const data = await adminApi.getAttributes();
    setAttributes(Array.isArray(data) ? data : []);
  };

  const loadTerms = async (attributeId: number) => {
    const data = await adminApi.getAttributeTerms(attributeId);
    setTerms(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadAttributes().catch((err) => setError(err instanceof Error ? err.message : "Failed to load attributes"));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(UNIT_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = Array.from(new Set(parsed.map((item) => item.trim().toLowerCase()).filter(Boolean)));
        if (normalized.length > 0) {
          setUnitOptions(normalized);
          if (!normalized.includes(unit)) {
            setUnit(normalized[0]);
          }
        }
      }
    } catch {
      // ignore invalid local storage
    }
  }, []);

  const persistUnits = (items: string[]) => {
    localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(items));
  };

  const onSaveAttribute = async () => {
    const trimmed = attributeName.trim();
    if (!trimmed) return;
    setError("");
    setNotice("");
    try {
      if (editingAttributeId) {
        await adminApi.updateAttribute(editingAttributeId, trimmed);
      } else {
        await adminApi.addAttribute(trimmed);
      }
      setAttributeName("");
      setEditingAttributeId(null);
      await loadAttributes();
      setNotice(editingAttributeId ? "Attribute updated." : "Attribute added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save attribute");
    }
  };

  const resetTermEditor = () => {
    setEditingTermId(null);
    setTermName("");
    setQuantityValue("");
    setUnit("gm");
  };

  const onDeleteAttribute = async (id: number) => {
    if (!window.confirm("Delete this attribute and all its terms?")) return;
    setError("");
    setNotice("");
    try {
      await adminApi.deleteAttribute(id);
      if (selectedAttributeId === id) {
        setSelectedAttributeId(null);
        setTerms([]);
        resetTermEditor();
      }
      await loadAttributes();
      setNotice("Attribute deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete attribute");
    }
  };

  const onConfigureTerms = async (attributeId: number) => {
    setSelectedAttributeId(attributeId);
    resetTermEditor();
    setError("");
    const selected = attributes.find((item) => item.id === attributeId);
    setNotice(selected ? `Configuring terms for ${selected.name}.` : "Configuring terms.");
    try {
      await loadTerms(attributeId);
      setTimeout(() => quantityInputRef.current?.focus(), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load terms");
    }
  };

  const onSaveTerm = async () => {
    if (!selectedAttributeId) {
      setError("Please click Configure Terms first.");
      return;
    }
    setError("");
    setNotice("");
    const payload = {
      term_name: formatTermName(quantityValue, unit, termName),
      quantity_value: quantityValue.trim() || undefined,
      unit: quantityValue.trim() ? unit : undefined,
    };
    if (!payload.term_name || !payload.term_name.trim()) {
      setError("Enter quantity + unit or custom term name.");
      return;
    }
    try {
      if (editingTermId) {
        await adminApi.updateAttributeTerm(editingTermId, payload);
      } else {
        await adminApi.addAttributeTerm(selectedAttributeId, payload);
      }
      resetTermEditor();
      await loadTerms(selectedAttributeId);
      setNotice(editingTermId ? "Term updated." : "Term added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save term");
    }
  };


  const onDeleteTerm = async (termId: number) => {
    if (!selectedAttributeId) return;
    if (!window.confirm("Delete this term?")) return;
    setError("");
    setNotice("");
    try {
      await adminApi.deleteAttributeTerm(termId);
      await loadTerms(selectedAttributeId);
      setNotice("Term deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete term");
    }
  };

  const selectedAttribute = attributes.find((item) => item.id === selectedAttributeId) ?? null;
  const isWeight = useMemo(
    () => (selectedAttribute?.name || "").trim().toLowerCase() === "weight",
    [selectedAttribute?.name]
  );

  const addPreset = (preset: string) => {
    setQuantityValue(preset);
    if (unit !== "gm" && unit !== "kg") {
      setUnit("gm");
    }
  };

  const onAddUnit = () => {
    const normalized = newUnitName.trim().toLowerCase();
    if (!normalized) {
      setError("Enter unit name (e.g. pack).");
      return;
    }
    if (unitOptions.includes(normalized)) {
      setError(`Unit "${normalized}" already exists.`);
      return;
    }
    const updated = [...unitOptions, normalized];
    setUnitOptions(updated);
    persistUnits(updated);
    setUnit(normalized);
    setNewUnitName("");
    setError("");
    setNotice(`Unit "${normalized}" added.`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attributes Management</h1>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold">{editingAttributeId ? "Edit Attribute" : "Add Attribute"}</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={attributeName}
            onChange={(event) => setAttributeName(event.target.value)}
            placeholder="Attribute name (e.g. Weight)"
            className="max-w-sm"
          />
          <Button type="button" onClick={onSaveAttribute}>
            {editingAttributeId ? "Update Attribute" : "Add Attribute"}
          </Button>
          {editingAttributeId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingAttributeId(null);
                setAttributeName("");
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Attribute</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map((attribute) => (
                <tr key={attribute.id} className="border-t">
                  <td className="p-3">{attribute.name}</td>
                  <td className="p-3 space-x-2">
                    <Button size="sm" variant="outline" onClick={() => onConfigureTerms(attribute.id)}>
                      Configure Terms
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingAttributeId(attribute.id);
                        setAttributeName(attribute.name);
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDeleteAttribute(attribute.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">
            {selectedAttribute ? `Terms for ${selectedAttribute.name}` : "Select an attribute to configure terms"}
          </h2>

          {selectedAttribute ? (
            <>
              {isWeight ? (
                <div className="rounded-md border bg-slate-50 p-2">
                  <p className="text-xs text-slate-600 mb-2">Quick presets</p>
                  <div className="flex flex-wrap gap-2">
                    {WEIGHT_PRESETS.map((preset) => (
                      <Button key={preset} type="button" size="sm" variant="outline" onClick={() => addPreset(preset)}>
                        {preset}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  ref={quantityInputRef}
                  value={quantityValue}
                  onChange={(event) => setQuantityValue(event.target.value)}
                  placeholder="Quantity (e.g. 250)"
                />
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                >
                  {unitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <Input
                  value={termName}
                  onChange={(event) => setTermName(event.target.value)}
                  placeholder="Custom term name (e.g. Pack)"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={newUnitName}
                  onChange={(event) => setNewUnitName(event.target.value)}
                  placeholder="Add new unit (e.g. pack)"
                  className="max-w-xs"
                />
                <Button type="button" variant="outline" onClick={onAddUnit}>
                  Add Unit
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={onSaveTerm}>
                  {editingTermId ? "Update Term" : "Add Term"}
                </Button>

                {editingTermId ? (
                  <Button type="button" variant="outline" onClick={resetTermEditor}>
                    Cancel
                  </Button>
                ) : null}
              </div>

              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3">Term</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((term) => (
                      <tr key={term.id} className="border-t">
                        <td className="p-3">{term.term_name}</td>
                        <td className="p-3">{term.quantity_value ?? "-"}</td>
                        <td className="p-3">{term.unit || "-"}</td>
                        <td className="p-3 space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditingTermId(term.id);
                              setTermName(term.term_name);
                              setQuantityValue(term.quantity_value != null ? String(term.quantity_value) : "");
                              setUnit(term.unit || "gm");
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDeleteTerm(term.id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Choose an attribute from the table on the left.</p>
          )}
        </div>
      </div>

      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default AdminAttributes;

