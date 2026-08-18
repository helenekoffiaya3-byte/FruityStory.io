window.FruityStoryPayPal = {
  async createOrder(planId, userId) {
    const response = await fetch('/.netlify/functions/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-order', planId, userId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Impossible de créer la commande PayPal');
    return data;
  },

  async captureOrder(orderId) {
    const response = await fetch('/.netlify/functions/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'capture-order', orderId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Impossible de confirmer le paiement PayPal');
    return data;
  }
};
