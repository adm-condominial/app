// ==========================================
// MÁSCARA UNIFICADA (Data, CPF e RG)
// ==========================================
function aplicarMascara(e) {
  const input = e.target;
  if (!input.classList.contains('campo-mascara')) return;

  const tipo = input.getAttribute('data-mascara');
  let valor = input.value.replace(/\D/g, "");

  if (tipo === 'data') {
    if (valor.length > 8) valor = valor.substring(0, 8);
    if (valor.length > 4) {
      valor = valor.substring(0, 2) + '/' + valor.substring(2, 4) + '/' + valor.substring(4);
    } else if (valor.length > 2) {
      valor = valor.substring(0, 2) + '/' + valor.substring(2);
    }
  } else if (tipo === 'cpf') {
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 9) {
      valor = valor.substring(0, 3) + '.' + valor.substring(3, 6) + '.' + valor.substring(6, 9) + '-' + valor.substring(9);
    } else if (valor.length > 6) {
      valor = valor.substring(0, 3) + '.' + valor.substring(3, 6) + '.' + valor.substring(6);
    } else if (valor.length > 3) {
      valor = valor.substring(0, 3) + '.' + valor.substring(3);
    }
  } else if (tipo === 'rg') {
    if (valor.length > 9) valor = valor.substring(0, 9);
    if (valor.length > 8) {
      valor = valor.substring(0, 2) + '.' + valor.substring(2, 5) + '.' + valor.substring(5, 8) + '-' + valor.substring(8);
    } else if (valor.length > 5) {
      valor = valor.substring(0, 2) + '.' + valor.substring(2, 5) + '.' + valor.substring(5);
    } else if (valor.length > 2) {
      valor = valor.substring(0, 2) + '.' + valor.substring(2);
    }
  }

  input.value = valor;
}

document.addEventListener('input', aplicarMascara);
