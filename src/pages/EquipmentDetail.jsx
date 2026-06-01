import { useParams } from 'react-router-dom';

function EquipmentDetail() {
  const { id } = useParams();
  return (
    <div className="main-content">
      <div className="placeholder-page">
        <h1>Equipment Detail</h1>
        <p>Coming soon (item: {id})</p>
      </div>
    </div>
  );
}

export default EquipmentDetail;
