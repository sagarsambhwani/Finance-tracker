import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Plus, ArrowLeft } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
interface Props {
    title: string
    description?: string
    createLink?: string
    createLabel?: string
    backLink?: string
    actions?: React.ReactNode
}

export function PageHeader({
                               title,
                               description,
                               createLink,
                               createLabel = 'Create',
                               backLink,
                               actions
                           }: Props) {
    return (
        <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {backLink && (
                        <Button variant="ghost" size="icon" asChild>
                            <Link to={backLink}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
                        {description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{description}</p>
                        )}
                    </div>
                </div>
                {(actions || createLink) && (
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        {actions}
                        {createLink && (
                            <Button asChild size="sm" className="sm:h-10 sm:px-4">
                                <Link to={createLink}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {createLabel}
                                </Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
            <Separator className="mt-4 sm:mt-6" />
        </div>
    )
}
