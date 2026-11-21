import './SidebarSkeleton.css';

function SidebarSkeleton() {
  return (
    <div className="sidebar-skeleton">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="sidebar-skeleton-item" key={index}>
          <div className="sidebar-skeleton-icon" />

          <div className="sidebar-skeleton-content">
            <div className="sidebar-skeleton-line" />
            <div className="sidebar-skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SidebarSkeleton;