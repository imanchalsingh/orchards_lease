import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orchardService } from '@/services/orchard.service';
import { Button, Input, Textarea, Select, Card, Badge } from '@/components/ui';
import OrchardHistoryEditor from '@/components/orchard/OrchardHistoryEditor';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';
import type { FilterOptions, Orchard } from '@/types';
import { titleCase } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Upload, Trash2, Plus, Image, Loader2 } from 'lucide-react';

interface LocalOrchardImage {
  url: string;
  [key: string]: unknown;
}

const empty = {
  gardenName: '',
  description: '',
  district: '',
  state: '',
  address: '',
  latitude: 20.5937,
  longitude: 78.9629,

  fruitTypes: [] as string[],
  totalTrees: 0,
  averageFruitPerTree: 0,
  expectedYield: 0,
  totalArea: 0,
  areaUnit: 'acre',
  rentType: 'season',
  price: 0,
  seasonalPricing: [] as { label: string; startMonth: number; endMonth: number; price: number }[],
  amenities: [] as string[],
  available: true,

  soilType: 'Loamy',
  soilDescription: '',

  plantationYear: 2020,

  soilFertility: 'Unknown',
  productionEstimate: { value: null, unit: 'kg' } as { value: number | null; unit: string },
  waterSourceQuality: 'Unknown',
  pestHistory: 'Unknown',
  diseaseHistory: 'Unknown',
  maintenanceStatus: 'Unknown',
  orchardAge: 0,

  waterPrimarySource: 'Borewell',
  waterSecondarySource: 'None',
  waterAvailableYearRound: true,
  waterSourceDescription: '',
  irrigationMethod: 'Drip',
  irrigationFrequency: 'Weekly',

  isOrganicallyCertified: false,
  certificationExpiryDate: '',
  certificateNumber: '',
  certificationDocumentUrl: '',

  images: [] as LocalOrchardImage[],
  videoTourUrl: '',
  documents: [] as { name: string; url: string; type: string }[],
  pestHistoryRecords: [],
  diseaseHistoryRecords: [],
};

export default function OrchardForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ ...empty });
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (!newImageUrl.startsWith('http://') && !newImageUrl.startsWith('https://') && !newImageUrl.startsWith('/uploads/')) {
      toast.error('Please enter a valid URL (starting with http://, https:// or /uploads/)');
      return;
    }
    const updatedImages = [...form.images, { url: newImageUrl.trim(), alt: '' }];
    set('images', updatedImages);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = form.images.filter((_, idx) => idx !== index);
    set('images', updatedImages);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const invalidFiles = Array.from(files).filter(f => !allowedTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error('Only PNG, JPG, and JPEG images are allowed.');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await orchardService.uploadImages(files);
      const newImages = uploaded.map(img => ({ url: img.url, alt: '' }));
      set('images', [...form.images, ...newImages]);
      toast.success('Images uploaded successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    orchardService.getFilterOptions().then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    orchardService
      .listMine({ page: 1 })
      .then((res) => {
        const found = res.data.find((o) => o._id === id);
        if (found) hydrate(found);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const hydrate = (o: Orchard) =>
    setForm({
      gardenName: o.gardenName,
      description: o.description || '',
      district: o.district,
      state: o.state,
      address: o.address || '',
      latitude: o.latitude || 20.5937,
      longitude: o.longitude || 78.9629,

      fruitTypes: o.fruitTypes,
      totalTrees: o.totalTrees,
      averageFruitPerTree: o.averageFruitPerTree,
      expectedYield: o.expectedYield,
      totalArea: o.totalArea,
      areaUnit: o.areaUnit,
      rentType: o.rentType,
      price: o.price,
      seasonalPricing: (o as any).seasonalPricing || [],
      amenities: o.amenities,
      available: o.available,

      soilType: (o as any).soilType || 'Loamy',
      soilDescription: (o as any).soilDescription || '',

      plantationYear: (o as any).plantationYear || 2020,

      soilFertility: (o as any).soilFertility || 'Unknown',
      productionEstimate: (o as any).productionEstimate || { value: null, unit: 'kg' },
      waterSourceQuality: (o as any).waterSourceQuality || 'Unknown',
      pestHistory: (o as any).pestHistory || 'Unknown',
      diseaseHistory: (o as any).diseaseHistory || 'Unknown',
      maintenanceStatus: (o as any).maintenanceStatus || 'Unknown',
      orchardAge: (o as any).orchardAge || 0,

      waterPrimarySource: (o as any).waterSources?.primary || (o as any).waterSource || 'Borewell',
      waterSecondarySource: (o as any).waterSources?.secondary || 'None',
      waterAvailableYearRound: (o as any).waterSources?.availableYearRound ?? true,
      waterSourceDescription: (o as any).waterSources?.description || '',
      irrigationMethod: (o as any).irrigationMethod || 'Drip',
      irrigationFrequency: (o as any).irrigationFrequency || 'Weekly',

      isOrganicallyCertified: (o as any).organicCertification?.isCertified || false,
      certificationExpiryDate: (o as any).organicCertification?.expiryDate
        ? new Date((o as any).organicCertification.expiryDate).toISOString().split('T')[0]
        : '',
      certificateNumber: (o as any).organicCertification?.certificateNumber || '',
      certificationDocumentUrl: (o as any).organicCertification?.documentUrl || '',

      images: (o.images as unknown as LocalOrchardImage[]) || [],
      videoTourUrl: (o as any).videoTourUrl || '',
      documents: (o as any).documents || [],
      pestHistoryRecords: (o as any).pestHistoryRecords || (o as any).pestHistory || [],
      diseaseHistoryRecords: (o as any).diseaseHistoryRecords || (o as any).diseaseHistory || [],
    });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: 'fruitTypes' | 'amenities', v: string) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }));

  const submit = async (status: 'draft' | 'pending') => {
    if (!form.gardenName || !form.state || !form.district || form.fruitTypes.length === 0 || !form.price) {
      toast.error('Please fill name, location, fruit and price');
      return;
    }

    if (form.isOrganicallyCertified && (!form.certificationExpiryDate || !form.certificationDocumentUrl)) {
      toast.error('Please provide expiry date and document URL for organic certification');
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),

      videoTourUrl: form.videoTourUrl,
      documents: form.documents,
      soilFertility: form.soilFertility,
      productionEstimate: form.productionEstimate,
      waterSourceQuality: form.waterSourceQuality,
      pestIncidents: form.pestHistoryRecords,
      diseaseIncidents: form.diseaseHistoryRecords,
      maintenanceStatus: form.maintenanceStatus,
      orchardAge: Number(form.orchardAge),

      waterSources: {
        primary: form.waterPrimarySource,
        secondary: form.waterSecondarySource,
        availableYearRound: form.waterAvailableYearRound,
        description: form.waterSourceDescription,
      },
      waterSource: form.waterPrimarySource,

      organicCertification: {
        isCertified: form.isOrganicallyCertified,
        expiryDate: form.isOrganicallyCertified && form.certificationExpiryDate ? form.certificationExpiryDate : null,
        certificateNumber: form.isOrganicallyCertified ? form.certificateNumber : '',
        documentUrl: form.isOrganicallyCertified ? form.certificationDocumentUrl : '',
      },
    };

    try {
      if (isEdit) {
        await orchardService.update(id!, payload as unknown as Partial<Orchard>);
        toast.success('Orchard updated');
      } else {
        await orchardService.create({ ...payload, status } as unknown as Partial<Orchard>);
        toast.success(status === 'draft' ? 'Draft saved' : 'Submitted for review');
      }
      navigate('/seller/orchards');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-faint">Loading…</p>;

  const chip = (active: boolean) =>
    cn(
      'cursor-pointer rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition-all',
      active ? 'border-forest bg-forest text-cream' : 'border-sand text-sub hover:border-faint'
    );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1.5 font-serif text-2xl font-semibold">{isEdit ? 'Edit orchard' : 'New orchard'}</h1>
      <p className="mb-6 text-sm text-faint">Provide accurate details — listings are reviewed before going live.</p>

      <div className="space-y-5">
        <Card className="space-y-4 p-6">
          <Input label="Garden name" value={form.gardenName} onChange={(e) => set('gardenName', e.target.value)} />
          <Textarea label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} />

          <Input
            label="Orchard Image URL"
            placeholder="https://example.com/orchard-photo.jpg"
            value={form.images[0]?.url || ''}
            onChange={(e) => set('images', e.target.value ? [{ url: e.target.value }] : [])}
          />
          {form.videoTourUrl && (
            <video src={form.videoTourUrl} controls className="w-full rounded-xl mt-2 max-h-64" />
          )}

          <Input
            label="Video Tour URL"
            placeholder="https://example.com/orchard-tour.mp4"
            value={form.videoTourUrl}
            onChange={(e) => set('videoTourUrl', e.target.value)}
          />
          {form.videoTourUrl && (
            <video src={form.videoTourUrl} controls className="w-full rounded-xl mt-2 max-h-64" />
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Orchard Documents</p>
              <button
                type="button"
                onClick={() => set('documents', [...form.documents, { name: '', url: '', type: 'Other' }])}
                className="text-xs font-semibold text-forest hover:underline"
              >
                + Add document
              </button>
            </div>
            {form.documents.map((d, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
                <input
                  placeholder="Document name (e.g. Land Record 2023)"
                  value={d.name}
                  onChange={(e) => {
                    const next = [...form.documents];
                    next[i] = { ...next[i], name: e.target.value };
                    set('documents', next);
                  }}
                  className="rounded-lg border border-sand bg-cream px-2.5 py-2 text-sm outline-none focus:border-forest"
                />
                <input
                  placeholder="Document URL (PDF or image)"
                  value={d.url}
                  onChange={(e) => {
                    const next = [...form.documents];
                    next[i] = { ...next[i], url: e.target.value };
                    set('documents', next);
                  }}
                  className="rounded-lg border border-sand bg-cream px-2.5 py-2 text-sm outline-none focus:border-forest"
                />
                <select
                  value={d.type}
                  onChange={(e) => {
                    const next = [...form.documents];
                    next[i] = { ...next[i], type: e.target.value };
                    set('documents', next);
                  }}
                  className="rounded-lg border border-sand bg-cream px-2 py-2 text-sm outline-none focus:border-forest"
                >
                  <option value="Ownership Proof">Ownership Proof</option>
                  <option value="Land Record">Land Record</option>
                  <option value="Soil Report">Soil Report</option>
                  <option value="Certification">Certification</option>
                  <option value="Other">Other</option>
                </select>
                <button
                  type="button"
                  onClick={() => set('documents', form.documents.filter((_, idx) => idx !== i))}
                  className="text-xs font-semibold text-terra hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="District" value={form.district} onChange={(e) => set('district', e.target.value)} />
            <Input label="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
          </div>

          <Input
            label="Full Address / Landmark"
            placeholder="e.g. Near Village Gate, Highway 44, District"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-sand/60">
            <Input
              label="Latitude (°N)"
              type="number"
              step="any"
              placeholder="e.g. 26.8467"
              value={form.latitude}
              onChange={(e) => set('latitude', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Longitude (°E)"
              type="number"
              step="any"
              placeholder="e.g. 80.9462"
              value={form.longitude}
              onChange={(e) => set('longitude', parseFloat(e.target.value) || 0)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <p className="mb-2 text-sm font-semibold">Fruit types</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {options?.fruitTypes.map((f) => (
              <span key={f} onClick={() => toggle('fruitTypes', f)} className={chip(form.fruitTypes.includes(f))}>
                {titleCase(f)}
              </span>
            ))}
          </div>
          <p className="mb-2 text-sm font-semibold">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {options?.amenities.map((a) => (
              <span key={a} onClick={() => toggle('amenities', a)} className={chip(form.amenities.includes(a))}>
                {titleCase(a)}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="mb-3 text-sm font-semibold">Pest & Disease History</p>
          <OrchardHistoryEditor value={(form as any).pestHistoryRecords} onChange={(v) => set('pestHistoryRecords', v)} title="Pest history" />
          <div className="mt-4" />
          <OrchardHistoryEditor value={(form as any).diseaseHistoryRecords} onChange={(v) => set('diseaseHistoryRecords', v)} title="Disease history" />
        </Card>

        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <Input label="Total trees" type="number" value={form.totalTrees} onChange={(e) => set('totalTrees', Number(e.target.value))} />
          <Input label="Avg fruit / tree" type="number" value={form.averageFruitPerTree} onChange={(e) => set('averageFruitPerTree', Number(e.target.value))} />
          <Input label="Expected yield (kg)" type="number" value={form.expectedYield} onChange={(e) => set('expectedYield', Number(e.target.value))} />

          <Input
            label="Plantation Year"
            type="number"
            placeholder="e.g., 2018"
            value={form.plantationYear}
            onChange={(e) => set('plantationYear', Number(e.target.value) || 2020)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Total area" type="number" value={form.totalArea} onChange={(e) => set('totalArea', Number(e.target.value))} />
            <Select label="Unit" value={form.areaUnit} onChange={(e) => set('areaUnit', e.target.value)}>
              {options?.areaUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => set('price', Number(e.target.value))} />
          <Select label="Rent type" value={form.rentType} onChange={(e) => set('rentType', e.target.value)}>
            {options?.rentTypes.map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </Select>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Seasonal pricing (optional)</p>
              <button
                type="button"
                onClick={() =>
                  set('seasonalPricing', [
                    ...form.seasonalPricing,
                    { label: '', startMonth: 1, endMonth: 3, price: form.price },
                  ])
                }
                className="text-xs font-semibold text-forest hover:underline"
              >
                + Add season
              </button>
            </div>
            <p className="mb-3 text-xs text-faint">
              Set a different price for specific months of the year — e.g. a higher price during peak harvest season.
            </p>
            {form.seasonalPricing.map((s, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2">
                <input
                  placeholder="Season label (e.g. Peak Season)"
                  value={s.label}
                  onChange={(e) => {
                    const next = [...form.seasonalPricing];
                    next[i] = { ...next[i], label: e.target.value };
                    set('seasonalPricing', next);
                  }}
                  className="rounded-lg border border-sand bg-cream px-2.5 py-2 text-sm outline-none focus:border-forest"
                />
                <select
                  value={s.startMonth}
                  onChange={(e) => {
                    const next = [...form.seasonalPricing];
                    next[i] = { ...next[i], startMonth: Number(e.target.value) };
                    set('seasonalPricing', next);
                  }}
                  className="rounded-lg border border-sand bg-cream px-2 py-2 text-sm outline-none focus:border-forest"
                >
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m + 1} value={m + 1}>
                      {new Date(2000, m).toLocaleString('en', { month: 'short' })}
                    </option>
                  ))}
                </select>
                <select
                  value={s.endMonth}
                  onChange={(e) => {
                    const next = [...form.seasonalPricing];
                    next[i] = { ...next[i], endMonth: Number(e.target.value) };
                    set('seasonalPricing', next);
                  }}
                  className="rounded-lg border border-sand bg-cream px-2 py-2 text-sm outline-none focus:border-forest"
                >
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m + 1} value={m + 1}>
                      {new Date(2000, m).toLocaleString('en', { month: 'short' })}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={s.price}
                  onChange={(e) => {
                    const next = [...form.seasonalPricing];
                    next[i] = { ...next[i], price: Number(e.target.value) };
                    set('seasonalPricing', next);
                  }}
                  className="w-24 rounded-lg border border-sand bg-cream px-2.5 py-2 text-sm outline-none focus:border-forest"
                />
                <button
                  type="button"
                  onClick={() => set('seasonalPricing', form.seasonalPricing.filter((_, idx) => idx !== i))}
                  className="text-xs font-semibold text-terra hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Orchard Health Parameters</p>
            <p className="text-xs text-faint">Specify these parameters to calculate your listing's dynamic Health Score.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Soil Fertility" value={form.soilFertility} onChange={(e) => set('soilFertility', e.target.value)}>
              <option value="Unknown">Unknown / Not Set</option>
              <option value="High">High Fertility (Nutrient-rich)</option>
              <option value="Medium">Medium Fertility (Standard)</option>
              <option value="Low">Low Fertility (Requires Supplementation)</option>
            </Select>

            <div>
              <label className="block text-sm font-medium mb-1 text-ink">Annual Production Estimate</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={form.productionEstimate.value ?? ''}
                  onChange={(e) =>
                    set('productionEstimate', {
                      ...form.productionEstimate,
                      value: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="e.g. 500"
                  className="flex-1"
                />
                <Select
                  value={form.productionEstimate.unit}
                  onChange={(e) => set('productionEstimate', { ...form.productionEstimate, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="tonnes">tonnes</option>
                  <option value="quintals">quintals</option>
                  <option value="boxes">boxes</option>
                </Select>
              </div>
            </div>

            <Select label="Water Source Quality" value={form.waterSourceQuality} onChange={(e) => set('waterSourceQuality', e.target.value)}>
              <option value="Unknown">Unknown / Not Set</option>
              <option value="High">High Quality (Sweet / Potable)</option>
              <option value="Medium">Medium Quality (Normal / Brackish)</option>
              <option value="Low">Low Quality (Salty / Contaminated)</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Pest History" value={form.pestHistory} onChange={(e) => set('pestHistory', e.target.value)}>
              <option value="Unknown">Unknown / Not Set</option>
              <option value="Low">Low (No recent outbreaks)</option>
              <option value="Medium">Medium (Occasional outbreaks)</option>
              <option value="High">High (Frequent infestation)</option>
            </Select>

            <Select label="Disease History" value={form.diseaseHistory} onChange={(e) => set('diseaseHistory', e.target.value)}>
              <option value="Unknown">Unknown / Not Set</option>
              <option value="Low">Low (No recent crop disease)</option>
              <option value="Medium">Medium (Occasional mildew/rot)</option>
              <option value="High">High (Severe disease history)</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Maintenance Status" value={form.maintenanceStatus} onChange={(e) => set('maintenanceStatus', e.target.value)}>
              <option value="Unknown">Unknown / Not Set</option>
              <option value="Good">Good (Pruned, cleared, managed)</option>
              <option value="Average">Average (Basic cleaning)</option>
              <option value="Poor">Poor (Neglected / Overgrown)</option>
            </Select>

            <Input
              label="Orchard Age (in Years)"
              type="number"
              min={0}
              value={form.orchardAge}
              onChange={(e) => set('orchardAge', Number(e.target.value) || 0)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <p className="mb-3 text-sm font-semibold">Soil Composition &amp; Quality</p>
          <div className="grid gap-4 sm:grid-cols-1">
            <Select label="Primary Soil Type" value={form.soilType} onChange={(e) => set('soilType', e.target.value)}>
              <option value="Loamy">Loamy Soil (Ideal Cultivation Blend)</option>
              <option value="Clayey">Clayey Soil (High Nutrient Retention)</option>
              <option value="Sandy">Sandy Soil (Rapid Drainage)</option>
              <option value="Alluvial">Alluvial Soil (Highly Fertile Silt)</option>
              <option value="Black">Black/Regur Soil (Excellent for Cotton &amp; Certain Fruits)</option>
              <option value="Red">Red &amp; Yellow Soil (Iron-rich Drainage)</option>
            </Select>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-sub">
                Custom Soil Description / pH Details
              </label>
              <textarea
                value={form.soilDescription}
                onChange={(e) => set('soilDescription', e.target.value)}
                className="w-full h-20 rounded-xl border border-sand bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-forest resize-none"
                placeholder="Describe nutrient conditions, fertilizer history, organic matter, or approximate pH levels..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Water Sources &amp; Irrigation Reliability</p>
            <p className="text-xs text-faint">Specify how water is supplied to help renters evaluate year-round reliability.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Primary Water Source" value={form.waterPrimarySource} onChange={(e) => set('waterPrimarySource', e.target.value)}>
              <option value="Borewell">Borewell</option>
              <option value="Canal">Canal System</option>
              <option value="River">River / Stream</option>
              <option value="Well">Open Well</option>
              <option value="Rainwater Harvesting">Rainwater Harvesting Reservoir</option>
              <option value="Drip Connection">Municipal / Utility Drip Line</option>
              <option value="Other">Other</option>
            </Select>

            <Select label="Secondary Water Source (Backup)" value={form.waterSecondarySource} onChange={(e) => set('waterSecondarySource', e.target.value)}>
              <option value="None">None (Single Source)</option>
              <option value="Borewell">Borewell</option>
              <option value="Canal">Canal System</option>
              <option value="River">River / Stream</option>
              <option value="Well">Open Well</option>
              <option value="Rainwater Harvesting">Rainwater Harvesting Reservoir</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Irrigation Method" value={form.irrigationMethod} onChange={(e) => set('irrigationMethod', e.target.value)}>
              <option value="Drip">Drip Irrigation</option>
              <option value="Sprinkler">Sprinkler System</option>
              <option value="Flood">Flood / Channel Irrigation</option>
              <option value="Manual">Manual Hose / Tanker</option>
            </Select>

            <Select label="Irrigation Frequency" value={form.irrigationFrequency} onChange={(e) => set('irrigationFrequency', e.target.value)}>
              <option value="Daily">Daily</option>
              <option value="Alternate Days">Alternate Days</option>
              <option value="Weekly">Weekly</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="As Needed">Seasonal / As Needed</option>
            </Select>
          </div>

          <div className="pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.waterAvailableYearRound}
                onChange={(e) => set('waterAvailableYearRound', e.target.checked)}
                className="h-4 w-4 rounded border-sand text-forest focus:ring-forest"
              />
              Water available throughout the year (12-month supply)
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-sub">
              Water Supply Notes / Seasonal Variation Details
            </label>
            <textarea
              value={form.waterSourceDescription}
              onChange={(e) => set('waterSourceDescription', e.target.value)}
              className="w-full h-20 rounded-xl border border-sand bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-forest resize-none"
              placeholder="Mention water depth, pump horsepower, summer availability notes, or canal schedule..."
            />
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Organic Certification</p>
              <p className="text-xs text-faint">Indicate whether this orchard holds a verified organic certificate.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isOrganicallyCertified}
                onChange={(e) => set('isOrganicallyCertified', e.target.checked)}
                className="h-4 w-4 rounded border-sand text-forest focus:ring-forest"
              />
              Organically Certified
            </label>
          </div>

          {form.isOrganicallyCertified && (
            <div className="space-y-4 pt-2 border-t border-sand/50">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Certificate Number (Optional)"
                  placeholder="e.g. ORG-2024-8892"
                  value={form.certificateNumber}
                  onChange={(e) => set('certificateNumber', e.target.value)}
                />
                <Input
                  label="Certification Expiry Date"
                  type="date"
                  value={form.certificationExpiryDate}
                  onChange={(e) => set('certificationExpiryDate', e.target.value)}
                />
              </div>

              <Input
                label="Certification Document URL"
                placeholder="https://example.com/certificates/organic-cert.pdf"
                value={form.certificationDocumentUrl}
                onChange={(e) => set('certificationDocumentUrl', e.target.value)}
              />
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <Badge tone={form.available ? 'green' : 'gray'}>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form.available} onChange={(e) => set('available', e.target.checked)} />
              Available
            </label>
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submit('draft')} loading={saving}>
              Save as draft
            </Button>
            <Button onClick={() => submit('pending')} loading={saving}>
              {isEdit ? 'Save changes' : 'Submit for review'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}