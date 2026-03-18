import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContactVia, mapContactViaLabel, mapOpportunityStatusLabel, OpportunityStatus, OpportunityWithCompany } from "@/lib/validators/oppotunities";
import { CONTACT_COLORS, STATUS_COLORS } from "@/utils/general";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Edit, MoreHorizontal, Star, Trash2, Copy, ArrowUpDown, Rocket } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ColumnsProps = {
    onStatusChange: (id: string, status: OpportunityStatus, opp: OpportunityWithCompany) => void; // Ajout de l'objet complet
    onConvert: (opp: OpportunityWithCompany) => void; // Nouvelle action
    onDeleteOpportunities: (ids: string[]) => void;
    editOpportunity: (opportunity: OpportunityWithCompany) => void;
    onFavoriteChange: (id: string, isFavorite: boolean) => void;
};

export const getColumns = ({
    onStatusChange,
    onConvert,
    onDeleteOpportunities,
    editOpportunity,
    onFavoriteChange
}: ColumnsProps): ColumnDef<OpportunityWithCompany>[] => [
        {
            header: "Entreprise",
            accessorKey: "company.name",
            cell: ({ row }) => {
                const opportunity = row.original;
                const companyName = opportunity.company?.name || "Inconnu";
                const initial = companyName.charAt(0).toUpperCase();

                return (
                    <div className="flex items-center gap-3">
                        <div className="flex shrink-0 h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100/50 dark:border-blue-900/50">
                            {initial}
                        </div>
                        <div className="flex flex-col max-w-[200px]">
                            <Link href={`opportunities/${opportunity.slug}`} className="font-bold text-sm text-foreground hover:text-blue-600 transition-colors truncate">
                                {companyName}
                            </Link>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest truncate">
                                {opportunity.company?.business_sector || "Secteur inconnu"}
                            </span>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: "company.email",
            header: "Contact",
            cell: ({ row }) => {
                const email = row.original.company?.email;
                if (!email) return <span className="text-muted-foreground italic text-xs">Pas d'email</span>;
                return (
                    <div
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-blue-600 transition-colors group"
                        onClick={() => {
                            navigator.clipboard.writeText(email);
                            toast.success("Email copié");
                        }}
                    >
                        <span className="max-w-[150px] truncate">{email}</span>
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )
            }
        },
        {
            accessorKey: "status",
            header: "Statut",
            cell: ({ row }) => {
                const status = row.getValue<OpportunityStatus>("status");
                const id = row.original.id;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Badge className={cn("cursor-pointer px-2.5 py-1 rounded-md border-none font-bold text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity", STATUS_COLORS[status])}>
                                {mapOpportunityStatusLabel[status]}
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-xl shadow-xl border-border p-1">
                            {Object.entries(mapOpportunityStatusLabel).map(([key, label]) => (
                                <DropdownMenuItem key={key} onClick={() => onStatusChange(id, key as OpportunityStatus, row.original)} className="focus:bg-muted rounded-lg cursor-pointer my-0.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[key as OpportunityStatus].replace("text-", "bg-").split(" ")[0]}`} />
                                        <span className="text-xs font-semibold">{label}</span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu >
                );
            },
        },
        {
            accessorKey: "contact_via",
            header: "Canal",
            filterFn: (row, columnId, value: ContactVia[]) => {
                if (!value || value.length === 0) return true;
                return value.includes(row.getValue(columnId));
            },
            cell: ({ row }) => {
                const contact_via: ContactVia = row.getValue("contact_via");
                const label = mapContactViaLabel[contact_via];
                const color = CONTACT_COLORS[contact_via] || "bg-muted text-muted-foreground";

                return (
                    <Badge variant="secondary" className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border-none shadow-none", color)}>
                        {label}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "description",
            header: "Aperçu",
            cell: ({ row }) => {
                const description: string = row.getValue("description");
                if (!description) return <span className="text-muted-foreground/30 text-xs italic">-</span>;
                return (
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-[250px] leading-relaxed">
                        {description}
                    </p>
                )
            }
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="h-8 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:bg-muted hover:text-foreground"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Création
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const date = new Date(row.getValue("created_at"));
                return (
                    <div className="text-xs font-medium text-muted-foreground">
                        {dayjs(date).format("DD MMM YYYY")}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const opportunity = row.original

                return (
                    <div className="flex justify-end pr-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border p-1">
                                <DropdownMenuItem onClick={() => editOpportunity(opportunity)} className="rounded-lg cursor-pointer">
                                    <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm font-medium">Modifier</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                    const formattedString = `Nom: ${opportunity.company?.name}\nEmail: ${opportunity.company?.email}\nSecteur: ${opportunity.company?.business_sector} \nDétails: ${opportunity.description} \nStatut  de l'opportunité: ${opportunity.status}\nA contacter via: ${opportunity.contact_via}`;
                                    await navigator.clipboard.writeText(formattedString);
                                    toast.success("Infos copiées");
                                }} className="rounded-lg cursor-pointer">
                                    <Copy className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm font-medium">Copier les infos</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onFavoriteChange(opportunity.id, !opportunity.is_favorite)} className="rounded-lg cursor-pointer">
                                    <Star className={cn("h-4 w-4 mr-2", opportunity.is_favorite ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                                    <span className="text-sm font-medium">{opportunity.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onConvert(opportunity)}
                                    className="rounded-lg cursor-pointer text-indigo-600 focus:bg-indigo-50 focus:text-indigo-700 font-bold"
                                >
                                    <Rocket className="h-4 w-4 mr-2" />
                                    <span>Convertir en Projet</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => onDeleteOpportunities([opportunity.id])} className="rounded-lg cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    <span className="text-sm font-medium">Supprimer</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        }
    ]
