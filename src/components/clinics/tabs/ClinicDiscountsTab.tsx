
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Percent, Tag, DollarSign } from 'lucide-react';
import { ClinicFullDetails, clinicsService } from '@/services/clinicsService';

export default function ClinicDiscountsTab() {
    const { control, register } = useFormContext<ClinicFullDetails>();

    // Lista dinâmica de descontos
    const { fields, append, remove } = useFieldArray({
        control,
        name: "clinic_discounts"
    });

    const handleAddDiscount = async () => {
        const clinicId = control._formValues.id;
        try {
            const newDiscount = await clinicsService.createRelatedRecord('clinic_discounts', {
                clinic_id: clinicId,
                name: 'Novo Desconto',
                value: 0,
                is_percentage: true,
                scope: 'global',
                target_product_ids: []
            });
            append(newDiscount);
        } catch (error) {
            console.error("Erro ao criar desconto", error);
        }
    };

    const handleRemoveDiscount = async (index: number, id: string) => {
        if (!confirm('Tem a certeza que deseja remover este desconto?')) return;
        try {
            await clinicsService.deleteRecord('clinic_discounts', id);
            remove(index);
        } catch (error) {
            console.error("Erro ao remover desconto", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium">Tabela de Descontos</h3>
                    <p className="text-sm text-gray-500">Configura descontos automáticos aplicáveis a esta clínica.</p>
                </div>
                <Button onClick={handleAddDiscount} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Desconto
                </Button>
            </div>

            <div className="grid gap-4">
                {fields.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                        <Percent className="h-10 w-10 mx-auto text-card-foreground/80 mb-2" />
                        <h3 className="text-sm font-medium text-gray-900">Sem descontos configurados</h3>
                        <p className="text-sm text-gray-500 mt-1">Defina regras de preço especiais para fidelizar este cliente.</p>
                    </div>
                ) : (
                    fields.map((field, index) => (
                        <Card key={field.id} className="relative overflow-hidden group hover:border-primary/20 transition-all">
                            <CardContent className="p-5">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                        onClick={() => {
                                            const currentValues = control._formValues.clinic_discounts || [];
                                            const realId = currentValues[index]?.id;
                                            if (realId) handleRemoveDiscount(index, realId);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid gap-6 md:grid-cols-12 items-start">
                                    {/* Ícone e Nome */}
                                    <div className="md:col-span-4 flex gap-3">
                                        <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-1">
                                            <Tag className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-3 w-full">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Nome da Regra</Label>
                                                <Input {...register(`clinic_discounts.${index}.name`)} className="font-medium h-9" placeholder="Ex: Protocolo 2024" />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2 border rounded-md p-1 bg-gray-50">
                                                    <label className="flex items-center gap-1 px-2 py-1 bg-white rounded shadow-sm text-xs font-medium cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            value="true"
                                                            {...register(`clinic_discounts.${index}.is_percentage`)}
                                                            className="hidden" // Usar estilo visual apenas
                                                        />
                                                        <Percent className="h-3 w-3" /> %
                                                    </label>
                                                    {/* Nota: Radio buttons nativos aqui podem ser tricky com RHF boolean. 
                                                        Mantemos simples: Input Select ou Checkbox custom. 
                                                        Vou simplificar: Select Percentagem/Valor Fixo.
                                                    */}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Valor e Tipo */}
                                    <div className="md:col-span-3 space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Valor do Desconto</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...register(`clinic_discounts.${index}.value`, { valueAsNumber: true })}
                                                    className="pl-8 h-9 font-bold text-green-700"
                                                />
                                                <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                                                    <DollarSign className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Âmbito (Global vs Específico) */}
                                    <div className="md:col-span-5 space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Aplicável a</Label>
                                            <select
                                                {...register(`clinic_discounts.${index}.scope`)}
                                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <option value="global">Todos os Produtos (Global)</option>
                                                <option value="specific">Produtos Específicos (Lista)</option>
                                            </select>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                            Se "Específico", a seleção de produtos será feita no módulo de Faturação.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
