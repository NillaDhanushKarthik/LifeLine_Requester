export const toLL = (c) => (c ? { latitude: c[1], longitude: c[0] } : null);
export const validPt = (c) => Array.isArray(c) && !(c[0] === 0 && c[1] === 0);
export const STEPS = ['Finding', 'On the way', 'Arrived', 'To hospital', 'Done'];
export const STEP_OF = {
  Searching: 0, 'Driver Assigned': 0, Accepted: 1, 'Driver Arriving': 1, Arrived: 2, 'Patient Picked': 3, 'Hospital Selected': 3, 'Hospital Notified': 3, 'Trip Started': 3, Completed: 4, Cancelled: 0,
  SEARCHING: 0, DRIVER_ASSIGNED: 0, ACCEPTED: 1, DRIVER_ARRIVING: 1, ARRIVED: 2, TRIP_STARTED: 3, COMPLETED: 4, CANCELLED: 0
};
export const CANCELLABLE = ['Searching', 'Accepted', 'Driver Arriving', 'Arrived', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVING', 'ARRIVED'];
export const TERMINAL = ['Completed', 'Cancelled', 'COMPLETED', 'CANCELLED'];
export const TO_HOSPITAL = ['Patient Picked', 'Hospital Selected', 'Hospital Notified', 'Trip Started', 'TRIP_STARTED'];
export function headline(status, hospital) {
  switch (status) {
    case 'Searching': case 'SEARCHING':
    case 'Driver Assigned': case 'DRIVER_ASSIGNED': return 'Finding the nearest ambulance…';
    case 'Accepted': case 'ACCEPTED': return 'Ambulance accepted your request';
    case 'Driver Arriving': case 'DRIVER_ARRIVING': return 'Ambulance is on the way';
    case 'Arrived': case 'ARRIVED': return 'Ambulance has arrived';
    case 'Patient Picked': return 'Selecting nearest multi-speciality hospital';
    case 'Hospital Selected': case 'Hospital Notified': case 'Trip Started': case 'TRIP_STARTED': return hospital ? `Heading to ${hospital.name}` : 'Heading to multi-speciality hospital';
    case 'Completed': case 'COMPLETED': return 'Trip completed';
    case 'Cancelled': case 'CANCELLED': return 'Request cancelled';
    default: return status;
  }
}
export const fmtDate = (d) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
