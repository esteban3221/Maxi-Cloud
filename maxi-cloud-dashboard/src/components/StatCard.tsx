interface StatCardProps {
    label: string
    value: string | number
    description?: string
}

export default function StatCard({ label, value, description }: StatCardProps) {
    return (
        <article className="stat-card">
            <div className="stat-card__value">{value}</div>
            <div className="stat-card__label">{label}</div>
            {description ? <p className="stat-card__description">{description}</p> : null}
        </article>
    )
}
