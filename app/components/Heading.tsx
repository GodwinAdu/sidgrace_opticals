
interface HeadingProps {
    title: string;
    description?: string;
}

const Heading: React.FC<HeadingProps> = ({
    title,
    description
}) => {
    return (
        <div className="px-2 py-2">
            <h2 className="text-3xl font-bold tracking-tight pb-2">{title}</h2>
            <p className='text-sm text-muted-foreground'>{description}</p>
        </div>
    )
}

export default Heading
