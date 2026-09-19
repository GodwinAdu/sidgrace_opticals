interface HeadingProps {
    title: string;
    description?: string;
}

const Heading: React.FC<HeadingProps> = ({
    title,
    description
}) => {
    return (
        <div className="flex items-start gap-3 py-2">
            <span className="mt-1 h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-teal-500 to-cyan-600" />
            <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
        </div>
    )
}

export default Heading
